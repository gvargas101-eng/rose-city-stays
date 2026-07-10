/**
 * Booking router — handles direct reservations with Stripe Checkout.
 * New flow: createCheckoutSession → redirect to Stripe hosted checkout →
 * checkout.session.completed webhook (or confirmation-page fallback) → Hostaway reservation
 */

import Stripe from "stripe";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  bookings,
  customFees,
  properties,
  siteSettings,
} from "../../drizzle/schema";
import { PROPERTY_TO_HOSTAWAY_ID } from "../hostaway";
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

  return confirmStoredBooking({
    bookingId,
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: session.id,
  });
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const hostawayListingId = PROPERTY_TO_HOSTAWAY_ID[input.propertyId];
      if (!hostawayListingId) {
        throw new Error(`Property not found: ${input.propertyId}`);
      }

      const subtotal = roundCurrency(input.nightlyRate * input.nights);
      const cleaningFee = await getCleaningFee(input.propertyId);
      const taxRate = await getTaxRate();
      const activeCustomFeeLines = await getActiveCustomFeeLines(subtotal);
      const customFeesTotal = roundCurrency(
        activeCustomFeeLines.reduce((sum, fee) => sum + fee.amount, 0)
      );
      const taxAmount = roundCurrency(subtotal * taxRate);
      const totalAmount = roundCurrency(subtotal + cleaningFee + taxAmount + customFeesTotal);

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
});