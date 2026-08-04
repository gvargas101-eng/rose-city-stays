/**
 * Booking router — handles direct reservations with Stripe Checkout.
 * New flow: createCheckoutSession → redirect to Stripe hosted checkout →
 * checkout.session.completed webhook (or confirmation-page fallback) → Hostaway reservation
 */

import Stripe from "stripe";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  bookings,
  customFees,
  properties,
  siteSettings,
  manualBookingLinks,
  upsellAddons,
} from "../../drizzle/schema";
import { PROPERTY_TO_HOSTAWAY_ID, getPropertyCalendar } from "../hostaway";
import { createHostawayReservation } from "../hostaway-booking";
import { notifyOwner } from "../_core/notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Legacy fallback cleaning fees (used if DB value is unavailable)
const CLEANING_FEES: Record<string, number> = {
  "the-briar": 150,
  "hospital-district": 125,
  "hollytree-golf-dining": 150,
  "alamo-house": 175,
  "green-acres": 150,
  "legacy-house": 150,
  "azalea-spring-cottage": 125,
  "noir-hollytree": 125,
  "hollytree-king-bed": 125,
  "hollytree-townhouse": 125,
  "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys": 125,
};

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function normalizePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null
): string | null {
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function getBaseUrl(req: { headers: Record<string, unknown> | any }): string {
  const origin = req?.headers?.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;

  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const host = forwardedHost || req?.headers?.host;
  const proto = typeof forwardedProto === "string" && forwardedProto.length > 0 ? forwardedProto : "https";

  if (typeof host === "string" && host.length > 0) {
    return `${proto}://${host}`;
  }

  return "https://rosecitystay-bn23yppa.manus.space";
}

async function getTaxRate(): Promise<number> {
  const db = await getDb();
  if (!db) return 0.09;

  const [setting] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "taxRate"))
    .limit(1);

  return setting ? parseFloat(setting.value) : 0.09;
}

async function getCleaningFee(propertyId: string): Promise<number> {
  const db = await getDb();
  if (!db) return CLEANING_FEES[propertyId] ?? 125;

  const [property] = await db
    .select({ cleaningFee: properties.cleaningFee })
    .from(properties)
    .where(eq(properties.slug, propertyId))
    .limit(1);

  return property ? parseFloat(String(property.cleaningFee)) : (CLEANING_FEES[propertyId] ?? 125);
}

async function getActiveCustomFeeLines(subtotal: number): Promise<Array<{ id: number; name: string; description: string | null; amount: number }>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(customFees)
    .where(eq(customFees.active, 1))
    .orderBy(asc(customFees.sortOrder));

  return rows.map((fee) => {
    const rawAmount = parseFloat(String(fee.amount));
    const computed = fee.type === "flat" ? rawAmount : (subtotal * rawAmount) / 100;
    return {
      id: fee.id,
      name: fee.name,
      description: fee.description,
      amount: roundCurrency(computed),
    };
  });
}

async function getActiveUpsellAddonLines(addonIds: number[]): Promise<Array<{ id: number; name: string; price: number }>> {
  if (!addonIds || addonIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(upsellAddons)
    .where(eq(upsellAddons.active, 1));

  return rows
    .filter(r => addonIds.includes(r.id))
    .map(r => ({
      id: r.id,
      name: r.name,
      price: roundCurrency(parseFloat(String(r.price))),
    }));
}

async function confirmStoredBooking(params: {
  bookingId: number;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, params.bookingId))
    .limit(1);

  if (!booking) {
    throw new Error("Booking record not found");
  }

  if (booking.status === "confirmed") {
    return {
      success: true,
      hostawayReservationId: booking.hostawayReservationId,
      booking,
    };
  }

  let hostawayReservationId: string | null = booking.hostawayReservationId;
  const externalBookingId = params.stripePaymentIntentId || params.stripeCheckoutSessionId || `booking-${booking.id}`;

  try {
    const checkInDate = new Date(booking.checkIn).toISOString().split("T")[0];
    const checkOutDate = new Date(booking.checkOut).toISOString().split("T")[0];

    const reservation = await createHostawayReservation({
      hostawayListingId: booking.hostawayListingId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone || undefined,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: booking.guestCount,
      totalPrice: Number(booking.totalAmount),
      message: booking.message || undefined,
      stripePaymentIntentId: externalBookingId,
    });

    hostawayReservationId = reservation.id;
  } catch (err) {
    console.error("[Booking] Hostaway reservation creation failed:", err);
    await notifyOwner({
      title: `⚠️ Hostaway Sync Failed — ${booking.guestName}`,
      content: `Payment succeeded (${externalBookingId}) but Hostaway reservation creation failed.\n\nGuest: ${booking.guestName} <${booking.guestEmail}>\nProperty: ${booking.propertyId}\nDates: ${new Date(booking.checkIn).toLocaleDateString()} – ${new Date(booking.checkOut).toLocaleDateString()}\n\nPlease create the reservation manually in Hostaway.\n\nError: ${String(err)}`,
    });
  }

  await db
    .update(bookings)
    .set({
      status: "confirmed",
      hostawayReservationId,
      stripePaymentIntentId: params.stripePaymentIntentId || booking.stripePaymentIntentId,
    })
    .where(eq(bookings.id, params.bookingId));

  await notifyOwner({
    title: `🎉 New Direct Booking — ${booking.guestName}`,
    content: [
      `**Guest:** ${booking.guestName} <${booking.guestEmail}>`,
      booking.guestPhone ? `**Phone:** ${booking.guestPhone}` : null,
      `**Property:** ${booking.propertyId}`,
      `**Check-in:** ${new Date(booking.checkIn).toLocaleDateString()}`,
      `**Check-out:** ${new Date(booking.checkOut).toLocaleDateString()}`,
      `**Nights:** ${booking.nights}`,
      `**Guests:** ${booking.guestCount}`,
      `**Total:** $${booking.totalAmount}`,
      params.stripePaymentIntentId ? `**Stripe PaymentIntent:** ${params.stripePaymentIntentId}` : null,
      params.stripeCheckoutSessionId ? `**Stripe Checkout Session:** ${params.stripeCheckoutSessionId}` : null,
      hostawayReservationId ? `**Hostaway Reservation:** ${hostawayReservationId}` : "⚠️ Hostaway sync failed — create manually",
      booking.message ? `**Message:** ${booking.message}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return {
    success: true,
    hostawayReservationId,
    booking: {
      id: booking.id,
      propertyId: booking.propertyId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      guestCount: booking.guestCount,
      totalAmount: booking.totalAmount,
      cleaningFee: booking.cleaningFee,
      nightlyRate: booking.nightlyRate,
      stripePaymentIntentId: params.stripePaymentIntentId || booking.stripePaymentIntentId,
    },
  };
}

export async function confirmStripeCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    throw new Error(`Checkout session not paid. Status: ${session.payment_status}`);
  }

  const bookingId = Number(session.client_reference_id);
  if (!bookingId || Number.isNaN(bookingId)) {
    throw new Error("Checkout session missing client_reference_id booking ID");
  }

  const paymentIntentId = normalizePaymentIntentId(session.payment_intent);

  // First confirm the booking (Hostaway + status update)
  await confirmStoredBooking({
    bookingId,
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: session.id,
  });

  // ── $500 Security Deposit Hold (post-checkout) ──
  // After the rental payment succeeds, retrieve the payment method from the
  // completed checkout session and create + confirm a deposit authorization hold
  // using capture_method: manual. This places a real hold on the guest's card
  // that the owner can later capture (charge) or cancel (release).
  let depositAmountDollars = 500; // default, overwritten from DB below
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) throw new Error("Booking not found for deposit hold");

    // Read configurable deposit amount from site_settings (default $500)
    const [depositSetting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "securityDepositAmount"))
      .limit(1);
    depositAmountDollars = depositSetting ? parseFloat(depositSetting.value) : 500;
    const depositAmountCents = Math.round(depositAmountDollars * 100);

    // Expand the checkout session to get the payment intent + payment method
    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent.payment_method"],
    });

    const pi = expandedSession.payment_intent as Stripe.PaymentIntent | null;
    const pm = pi?.payment_method as Stripe.PaymentMethod | null;

    if (!pm?.id) {
      console.warn("[deposit hold] No payment method found on checkout session — skipping hold");
    } else {
      // Create and confirm the deposit hold in one step
      const depositIntent = await stripe.paymentIntents.create({
        amount: depositAmountCents, // configurable via admin settings
        currency: "usd",
        capture_method: "manual",
        confirm: true,
        payment_method: pm.id,
        customer: typeof pi?.customer === "string" ? pi.customer : (pi?.customer as Stripe.Customer | null)?.id ?? undefined,
        description: `Security deposit hold — Booking #${bookingId} — ${booking.propertyId}`,
        metadata: {
          bookingId: String(bookingId),
          propertyId: booking.propertyId,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          type: "security_deposit_hold",
        },
        receipt_email: booking.guestEmail,
        // off_session because the guest is no longer in the browser flow
        off_session: true,
      });

      const holdStatus =
        depositIntent.status === "requires_capture" ? "authorized" :
        depositIntent.status === "succeeded" ? "captured" :
        depositIntent.status === "canceled" ? "released" : "pending";

      await db
        .update(bookings)
        .set({ depositHoldIntentId: depositIntent.id, depositHoldStatus: holdStatus })
        .where(eq(bookings.id, bookingId));

      console.log(`[deposit hold] $${depositAmountDollars} hold created: ${depositIntent.id} (${holdStatus})`);
    }
  } catch (depositErr: any) {
    // Non-fatal: log and notify owner but don't fail the booking confirmation
    console.error("[deposit hold] Failed to create post-checkout deposit hold:", depositErr?.message);
    try {
      await notifyOwner({
        title: `⚠️ Deposit Hold Failed — Booking #${bookingId}`,
        content: `The $${depositAmountDollars} security deposit hold could not be placed after checkout.\n\nError: ${depositErr?.message}\n\nPlease manually create the hold in the Stripe dashboard or contact the guest.`,
      });
    } catch (_) { /* ignore notification failure */ }
  }

  return { success: true };
}

export const bookingRouter = router({
  /**
   * Create a Stripe Checkout Session and a pending booking record.
   * Promo / coupon codes are enabled via Stripe Checkout.
   */
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        propertyName: z.string(),
        checkIn: z.string(),
        checkOut: z.string(),
        nights: z.number().int().min(1),
        nightlyRate: z.number().positive(),
        guestCount: z.number().int().min(1),
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestPhone: z.string().optional(),
        message: z.string().optional(),
        guestIdUrl: z.string().url().optional(),
        agreementAcceptedAt: z.number().int().optional(),
        selectedAddonIds: z.array(z.number().int()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const hostawayListingId = PROPERTY_TO_HOSTAWAY_ID[input.propertyId];
      if (!hostawayListingId) {
        throw new Error(`Property not found: ${input.propertyId}`);
      }

      // ── Availability guard: check Hostaway calendar before accepting payment ──
      try {
        // Use the input strings directly — they are already yyyy-MM-dd from the frontend
        const checkInDate = input.checkIn.slice(0, 10);
        const checkOutDate = input.checkOut.slice(0, 10);
        console.log(`[Booking] Availability check: property=${input.propertyId} checkIn=${checkInDate} checkOut=${checkOutDate}`);
        const calendarDays = await getPropertyCalendar(input.propertyId, checkInDate, checkOutDate);
        console.log(`[Booking] Calendar returned ${calendarDays.length} days:`, JSON.stringify(calendarDays.map(d => ({ date: d.date, isAvailable: d.isAvailable, status: d.status }))));
        // Build set of stay nights (check-in inclusive, check-out exclusive)
        const stayDates = new Set<string>();
        let cur = checkInDate;
        while (cur < checkOutDate) {
          stayDates.add(cur);
          // Advance by one day using string arithmetic
          const d = new Date(cur + "T12:00:00Z");
          d.setUTCDate(d.getUTCDate() + 1);
          cur = d.toISOString().slice(0, 10);
        }
        console.log(`[Booking] Stay dates:`, Array.from(stayDates));
        // A day is unavailable if isAvailable is false OR if status is not "available"
        // (Hostaway may return isAvailable: 1 for owner-blocked dates in some configurations,
        //  so checking status directly is the more reliable signal)
        const blockedDays = calendarDays.filter(
          d => stayDates.has(d.date) && (!d.isAvailable || d.status !== "available")
        );
        console.log(`[Booking] Blocked days found: ${blockedDays.length}`, blockedDays.map(d => ({ date: d.date, isAvailable: d.isAvailable, status: d.status })));
        if (blockedDays.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Sorry, ${blockedDays.length === 1 ? `${blockedDays[0].date} is` : `${blockedDays.length} dates are`} no longer available for ${input.propertyName}. Please select different dates.`,
          });
        }
      } catch (err) {
        // Re-throw TRPCErrors (availability blocks); swallow Hostaway API errors
        // so a calendar fetch failure never prevents a valid booking
        if (err instanceof TRPCError) throw err;
        console.warn("[Booking] Availability pre-check failed (non-fatal):", err);
      }

      const EXTRA_GUEST_FEE_PER_NIGHT = 10;
      const MAX_INCLUDED_GUESTS = 4;
      const extraGuests = Math.max(0, input.guestCount - MAX_INCLUDED_GUESTS);
      const overageFee = roundCurrency(extraGuests * EXTRA_GUEST_FEE_PER_NIGHT * input.nights);

      const subtotal = roundCurrency(input.nightlyRate * input.nights);
      const cleaningFee = await getCleaningFee(input.propertyId);
      const taxRate = await getTaxRate();
      const activeCustomFeeLines = await getActiveCustomFeeLines(subtotal);
      const customFeesTotal = roundCurrency(
        activeCustomFeeLines.reduce((sum, fee) => sum + fee.amount, 0)
      );
      const upsellAddonLines = await getActiveUpsellAddonLines(input.selectedAddonIds ?? []);
      const upsellAddonsTotal = roundCurrency(
        upsellAddonLines.reduce((sum, a) => sum + a.price, 0)
      );
      const taxAmount = roundCurrency(subtotal * taxRate);
      const totalAmount = roundCurrency(subtotal + cleaningFee + taxAmount + customFeesTotal + overageFee + upsellAddonsTotal);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [inserted] = await db
        .insert(bookings)
        .values({
          propertyId: input.propertyId,
          hostawayListingId,
          guestName: input.guestName,
          guestEmail: input.guestEmail.toLowerCase().trim(),
          guestPhone: input.guestPhone || null,
          guestCount: input.guestCount,
          checkIn: new Date(input.checkIn).getTime(),
          checkOut: new Date(input.checkOut).getTime(),
          nights: input.nights,
          nightlyRate: String(roundCurrency(input.nightlyRate)),
          subtotal: String(subtotal),
          cleaningFee: String(cleaningFee),
          taxAmount: String(taxAmount),
          taxRate: String(taxRate),
          totalAmount: String(totalAmount),
          status: "pending",
          message: input.message || null,
          guestIdUrl: input.guestIdUrl || null,
          agreementAcceptedAt: input.agreementAcceptedAt || null,
        })
        .$returningId();

      const bookingId = inserted.id;
      const baseUrl = getBaseUrl(ctx.req as any);

      // The $500 security deposit hold is created AFTER the guest completes
      // checkout, inside confirmStripeCheckoutSession, using the payment method
      // from the completed Checkout Session. See that function for details.

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: input.guestEmail,
        client_reference_id: String(bookingId),
        allow_promotion_codes: true,
        success_url: `${baseUrl}/booking/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/property/${input.propertyId}`,
        metadata: {
          bookingId: String(bookingId),
          propertyId: input.propertyId,
          propertyName: input.propertyName,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights: String(input.nights),
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone || "",
          guestCount: String(input.guestCount),
          message: input.message || "",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${input.propertyName} — Lodging`,
                description: `${input.checkIn} to ${input.checkOut} · ${input.nights} night${input.nights === 1 ? "" : "s"}`,
              },
              unit_amount: dollarsToCents(roundCurrency(input.nightlyRate)),
            },
            quantity: input.nights,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Cleaning fee",
              },
              unit_amount: dollarsToCents(cleaningFee),
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Hotel occupancy tax (${Math.round(taxRate * 100)}%)`,
              },
              unit_amount: dollarsToCents(taxAmount),
            },
            quantity: 1,
          },
          ...(overageFee > 0 ? [{
            price_data: {
              currency: "usd" as const,
              product_data: {
                name: `Extra guests (${extraGuests} guest${extraGuests > 1 ? 's' : ''} × $${EXTRA_GUEST_FEE_PER_NIGHT}/night)`,
                description: `Base rate covers up to ${MAX_INCLUDED_GUESTS} guests. $${EXTRA_GUEST_FEE_PER_NIGHT}/night per additional guest.`,
              },
              unit_amount: dollarsToCents(roundCurrency(extraGuests * EXTRA_GUEST_FEE_PER_NIGHT)),
            },
            quantity: input.nights,
          }] : []),
          ...activeCustomFeeLines.map((fee) => ({
            price_data: {
              currency: "usd" as const,
              product_data: {
                name: fee.name,
                description: fee.description || undefined,
              },
              unit_amount: dollarsToCents(fee.amount),
            },
            quantity: 1,
          })),
          ...upsellAddonLines.map((addon) => ({
            price_data: {
              currency: "usd" as const,
              product_data: {
                name: addon.name,
              },
              unit_amount: dollarsToCents(addon.price),
            },
            quantity: 1,
          })),
        ],
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        bookingId,
        subtotal,
        cleaningFee,
        taxAmount,
        taxRate,
        customFeesTotal,
        upsellAddonsTotal,
        totalAmount,
      };
    }),

  /**
   * Legacy confirm endpoint kept for backwards compatibility with old links.
   */
  confirmBooking: publicProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.stripePaymentIntentId, input.paymentIntentId))
        .limit(1);

      if (!booking) {
        throw new Error("Booking record not found");
      }

      return confirmStoredBooking({
        bookingId: booking.id,
        stripePaymentIntentId: input.paymentIntentId,
      });
    }),

  /** Get all bookings for a guest by email address */
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(bookings)
        .where(eq(bookings.guestEmail, input.email.toLowerCase().trim()))
        .orderBy(bookings.createdAt);

      return results.map((b) => ({
        id: b.id,
        propertyId: b.propertyId,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.nights,
        guestCount: b.guestCount,
        totalAmount: b.totalAmount,
        cleaningFee: b.cleaningFee,
        nightlyRate: b.nightlyRate,
        taxAmount: b.taxAmount,
        status: b.status,
        hostawayReservationId: b.hostawayReservationId,
        createdAt: b.createdAt,
      }));
    }),

  /** Get booking details by payment intent ID (legacy support) */
  getByPaymentIntent: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.stripePaymentIntentId, input.paymentIntentId))
        .limit(1);

      if (!booking) return null;

      return {
        id: booking.id,
        propertyId: booking.propertyId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guestCount: booking.guestCount,
        totalAmount: booking.totalAmount,
        cleaningFee: booking.cleaningFee,
        nightlyRate: booking.nightlyRate,
        taxAmount: booking.taxAmount,
        status: booking.status,
        hostawayReservationId: booking.hostawayReservationId,
      };
    }),

  /**
   * Get booking details by Checkout Session ID.
   * If the payment succeeded but the webhook is delayed, this also performs the
   * confirmation step as a fallback so the guest still lands on a completed booking.
   */
  getByCheckoutSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["payment_intent"],
      });

      const bookingId = Number(session.client_reference_id);
      if (!bookingId || Number.isNaN(bookingId)) return null;

      const db = await getDb();
      if (!db) return null;

      const [bookingBefore] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!bookingBefore) return null;

      if (session.payment_status === "paid" && bookingBefore.status !== "confirmed") {
        try {
          await confirmStripeCheckoutSession(session);
        } catch (err) {
          console.error("[Booking] Confirmation fallback from confirmation page failed:", err);
        }
      }

      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking) return null;

      return {
        id: booking.id,
        propertyId: booking.propertyId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guestCount: booking.guestCount,
        totalAmount: booking.totalAmount,
        cleaningFee: booking.cleaningFee,
        nightlyRate: booking.nightlyRate,
        taxAmount: booking.taxAmount,
        status: booking.status,
        hostawayReservationId: booking.hostawayReservationId,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        checkoutSessionId: session.id,
      };
    }),

  /** Get a manual booking link by token (public — used by guest payment page) */
  getManualBookingLink: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [link] = await db
        .select()
        .from(manualBookingLinks)
        .where(eq(manualBookingLinks.token, input.token))
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Booking link not found" });
      if (link.status === "revoked") throw new TRPCError({ code: "FORBIDDEN", message: "This booking link has been revoked" });
      if (link.status === "paid") throw new TRPCError({ code: "FORBIDDEN", message: "This booking has already been paid" });
      if (Date.now() > link.expiresAt) throw new TRPCError({ code: "FORBIDDEN", message: "This booking link has expired" });
      // Return safe fields only (no internal IDs)
      return {
        id: link.id,
        propertySlug: link.propertySlug,
        propertyName: link.propertyName,
        checkIn: link.checkIn,
        checkOut: link.checkOut,
        nights: link.nights,
        guestCount: link.guestCount,
        nightlyRate: link.nightlyRate,
        cleaningFee: link.cleaningFee,
        discountAmount: link.discountAmount,
        extraGuestFee: link.extraGuestFee,
        taxAmount: link.taxAmount,
        totalAmount: link.totalAmount,
        bypassCameraDisclosure: Boolean(link.bypassCameraDisclosure),
        bypassGuestCount: Boolean(link.bypassGuestCount),
        bypassTermsAcceptance: Boolean(link.bypassTermsAcceptance),
        bypassIdUpload: Boolean(link.bypassIdUpload),
        guestName: link.guestName,
        guestEmail: link.guestEmail,
        expiresAt: link.expiresAt,
        status: link.status,
        securityDepositOverride: link.securityDepositOverride ? Number(link.securityDepositOverride) : null,
        guestNote: link.guestNote ?? null,
        customLineItems: link.customLineItems
          ? (JSON.parse(link.customLineItems) as { label: string; amount: number }[])
          : [],
      };
    }),

  /** Create a Stripe Checkout Session for a manual booking link */
  createManualBookingCheckout: publicProcedure
    .input(
      z.object({
        token: z.string(),
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestIdUrl: z.string().url().optional(),
        origin: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [link] = await db
        .select()
        .from(manualBookingLinks)
        .where(eq(manualBookingLinks.token, input.token))
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      if (link.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "This booking link is no longer active" });
      if (Date.now() > link.expiresAt) throw new TRPCError({ code: "FORBIDDEN", message: "This booking link has expired" });

      // ── Availability guard for manual booking checkout ──
      // Always run — use DB hostawayListingId if present, otherwise fall back to
      // the hardcoded PROPERTY_TO_HOSTAWAY_ID map so the check never silently skips.
      const hasHostawayId = link.hostawayListingId || PROPERTY_TO_HOSTAWAY_ID[link.propertySlug];
      if (hasHostawayId) {
        try {
          const checkInDate = new Date(link.checkIn).toISOString().split("T")[0];
          const checkOutDate = new Date(link.checkOut).toISOString().split("T")[0];
          console.log(`[ManualBooking] Availability check: property=${link.propertySlug} checkIn=${checkInDate} checkOut=${checkOutDate}`);
          // getPropertyCalendar uses the hardcoded PROPERTY_TO_HOSTAWAY_ID map internally
          const calendarDays = await getPropertyCalendar(link.propertySlug, checkInDate, checkOutDate);
          console.log(`[ManualBooking] Calendar returned ${calendarDays.length} days:`, JSON.stringify(calendarDays.map(d => ({ date: d.date, isAvailable: d.isAvailable, status: d.status }))));
          // Build stay nights using UTC-safe string arithmetic to avoid timezone shifts
          const stayDates = new Set<string>();
          let cur = checkInDate;
          while (cur < checkOutDate) {
            stayDates.add(cur);
            const d = new Date(cur + "T12:00:00Z");
            d.setUTCDate(d.getUTCDate() + 1);
            cur = d.toISOString().slice(0, 10);
          }
          // Block if isAvailable is false OR status is not "available" (covers owner-blocked dates)
          const blockedDays = calendarDays.filter(d => stayDates.has(d.date) && (!d.isAvailable || d.status !== "available"));
          console.log(`[ManualBooking] Blocked days: ${blockedDays.length}`, blockedDays.map(d => ({ date: d.date, isAvailable: d.isAvailable, status: d.status })));
          if (blockedDays.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `These dates are no longer available for ${link.propertyName}. Please contact us to arrange alternative dates.`,
            });
          }
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.warn("[ManualBooking] Availability pre-check failed (non-fatal):", err);
        }
      }

      const lineItems: any[] = [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${link.propertyName} \u2014 ${link.nights} night${link.nights !== 1 ? "s" : ""}` },
            unit_amount: dollarsToCents(Number(link.nightlyRate) * link.nights),
          },
          quantity: 1,
        },
      ];
      if (Number(link.cleaningFee) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Cleaning fee" },
            unit_amount: dollarsToCents(Number(link.cleaningFee)),
          },
          quantity: 1,
        });
      }
      if (Number(link.extraGuestFee) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Extra guest fee" },
            unit_amount: dollarsToCents(Number(link.extraGuestFee)),
          },
          quantity: 1,
        });
      }
      if (Number(link.taxAmount) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Taxes & fees" },
            unit_amount: dollarsToCents(Number(link.taxAmount)),
          },
          quantity: 1,
        });
      }
      // Add custom line items (admin-defined per-booking fees)
      if (link.customLineItems) {
        try {
          const customItems = JSON.parse(link.customLineItems) as { label: string; amount: number }[];
          for (const item of customItems) {
            if (item.amount > 0) {
              lineItems.push({
                price_data: {
                  currency: "usd",
                  product_data: { name: item.label },
                  unit_amount: dollarsToCents(item.amount),
                },
                quantity: 1,
              });
            }
          }
        } catch { /* ignore parse errors */ }
      }
      // Apply discount as a negative line item if present
      if (Number(link.discountAmount) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Discount" },
            unit_amount: -dollarsToCents(Number(link.discountAmount)),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: input.guestEmail,
        success_url: `${input.origin}/booking/manual-confirm?token=${input.token}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/booking/pay/${input.token}`,
        metadata: {
          manual_booking_token: input.token,
          guest_name: input.guestName,
          guest_email: input.guestEmail,
          guest_id_url: input.guestIdUrl ?? "",
          property_slug: link.propertySlug,
          property_name: link.propertyName,
        },
        allow_promotion_codes: true,
      });

      // Store the checkout session ID on the link
      await db
        .update(manualBookingLinks)
        .set({ stripeCheckoutSessionId: session.id })
        .where(eq(manualBookingLinks.id, link.id));

      return { checkoutUrl: session.url! };
    }),

  /** Confirm a paid manual booking (called from confirmation page) */
  confirmManualBooking: publicProcedure
    .input(z.object({ token: z.string(), sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [link] = await db
        .select()
        .from(manualBookingLinks)
        .where(eq(manualBookingLinks.token, input.token))
        .limit(1);
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      if (link.status === "paid") return { alreadyConfirmed: true };

      // Verify with Stripe
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      if (session.payment_status !== "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed" });
      }

      const guestName = session.metadata?.guest_name ?? link.guestName ?? "Guest";
      const guestEmail = session.metadata?.guest_email ?? link.guestEmail ?? "";
      const guestIdUrl = session.metadata?.guest_id_url || null;

      // Mark link as paid
      await db
        .update(manualBookingLinks)
        .set({ status: "paid", stripeCheckoutSessionId: session.id })
        .where(eq(manualBookingLinks.id, link.id));

      // Create Hostaway reservation if listing ID is available
      let hostawayReservationId: number | null = null;
      if (link.hostawayListingId) {
        try {
          const checkInDate = new Date(link.checkIn).toISOString().split("T")[0];
          const checkOutDate = new Date(link.checkOut).toISOString().split("T")[0];
          const res = await createHostawayReservation({
            hostawayListingId: link.hostawayListingId!,
            guestName,
            guestEmail,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: link.guestCount,
            totalPrice: Number(link.totalAmount),
            stripePaymentIntentId: session.payment_intent as string ?? "",
          });
          hostawayReservationId = res?.id ? Number(res.id) : null;
          await db
            .update(manualBookingLinks)
            .set({ hostawayReservationId: hostawayReservationId ? String(hostawayReservationId) : null })
            .where(eq(manualBookingLinks.id, link.id));
        } catch (err) {
          console.error("[ManualBooking] Hostaway sync failed:", err);
          await notifyOwner({
            title: "Manual Booking — Hostaway Sync Failed",
            content: `Guest: ${guestName} (${guestEmail})\nProperty: ${link.propertyName}\nDates: ${new Date(link.checkIn).toLocaleDateString()} – ${new Date(link.checkOut).toLocaleDateString()}\nTotal: $${link.totalAmount}\n\nHostaway calendar was NOT updated. Please add manually.`,
          });
        }
      }

      // Notify owner
      await notifyOwner({
        title: `New Manual Booking — ${link.propertyName}`,
        content: `Guest: ${guestName}\nEmail: ${guestEmail}\nDates: ${new Date(link.checkIn).toLocaleDateString()} – ${new Date(link.checkOut).toLocaleDateString()}\nGuests: ${link.guestCount}\nTotal: $${link.totalAmount}${hostawayReservationId ? `\nHostaway #${hostawayReservationId}` : ""}\n\nReply: mailto:${guestEmail}`,
      });

      return {
        alreadyConfirmed: false,
        propertyName: link.propertyName,
        propertySlug: link.propertySlug,
        guestName,
        checkIn: link.checkIn,
        checkOut: link.checkOut,
        nights: link.nights,
        guestCount: link.guestCount,
        totalAmount: link.totalAmount,
        hostawayReservationId,
      };
    }),
});