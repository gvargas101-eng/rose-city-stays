import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import {
  bookings,
  manualBookingLinks,
  ownerBookingPayments,
  properties,
  siteSettings,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getPropertyCalendar, PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";
import {
  createHostawayOwnerReservation,
  findHostawayOwnerReservation,
  getHostawayOwnerPaymentState,
} from "./hostaway-booking";
import { validateManualBookingAmounts } from "../shared/manualBookingAmounts";
import { syncOwnerReceiptToHostaway } from "./owner-booking-payments";

const money = z.number().finite().min(0).max(9999999.99);
export const ownerBookingInput = z.object({
  requestKey: z.string().uuid(),
  propertySlug: z.string().min(1).max(64),
  propertyName: z.string().optional(),
  hostawayListingId: z.number().int().positive().optional(),
  checkIn: z.number().int().positive(),
  checkOut: z.number().int().positive(),
  nights: z.number().int().min(1).max(730),
  guestCount: z.number().int().positive().max(100),
  guestName: z.string().trim().min(1).max(256),
  guestEmail: z.string().trim().email().max(320),
  guestPhone: z.string().trim().max(32).optional(),
  nightlyRate: money,
  cleaningFee: money.default(0),
  discountAmount: money.default(0),
  discountCodeId: z.number().int().positive().optional(),
  discountLabel: z.string().max(128).optional(),
  extraGuestFee: money.default(0),
  taxAmount: money.default(0),
  totalAmount: money,
  customLineItems: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(128),
        amount: z.number().finite().min(-9999999.99).max(9999999.99),
      })
    )
    .max(50)
    .optional(),
  amountReceived: money.default(0),
  paymentReference: z.string().trim().max(256).optional(),
  allowUnpaid: z.boolean().default(false),
  createPaymentLink: z.boolean().default(false),
  expiryDays: z.number().int().min(1).max(90).default(7),
  securityDepositOverride: money.optional(),
  guestNote: z.string().max(5000).optional(),
  adminNotes: z.string().max(5000).optional(),
  bypassCameraDisclosure: z.boolean().default(false),
  bypassGuestCount: z.boolean().default(false),
  bypassTermsAcceptance: z.boolean().default(false),
  bypassIdUpload: z.boolean().default(false),
  bypassAvailabilityCheck: z.boolean().default(false),
});
export type OwnerBookingInput = z.infer<typeof ownerBookingInput>;
const dayMs = 86400000;
const cent = (n: number) => Math.round(n * 100);
const dateOnly = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function ownerPaymentSummary(total: number, received: number) {
  const balanceDue = Math.max(0, cent(total) - cent(received)) / 100;
  return {
    totalAmount: total,
    amountPaid: received,
    balanceDue,
    paymentStatus:
      total === 0
        ? "complimentary"
        : balanceDue === 0
          ? "paid"
          : received > 0
            ? "partially_paid"
            : "unpaid",
  };
}

export function validateOwnerBooking(input: OwnerBookingInput) {
  if (
    input.checkIn % dayMs !== 0 ||
    input.checkOut % dayMs !== 0 ||
    (input.checkOut - input.checkIn) / dayMs !== input.nights
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Check-in, check-out, and night count must match UTC calendar dates.",
    });
  }
  let amounts;
  try {
    amounts = validateManualBookingAmounts(input, { allowZero: true });
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: (error as Error).message,
    });
  }
  if (cent(amounts.total) !== cent(input.totalAmount))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Reservation total does not match its itemized charges and credits.",
    });
  if (
    Math.abs(cent(input.amountReceived) / 100 - input.amountReceived) >
      0.00000001 ||
    cent(input.amountReceived) > cent(amounts.total)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Amount received must be a cent-accurate amount no greater than the reservation total.",
    });
  }
  if (input.amountReceived > 0 && !input.paymentReference)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Add a payment reference for money you have actually received elsewhere.",
    });
  const summary = ownerPaymentSummary(amounts.total, input.amountReceived);
  if (summary.balanceDue > 0 && !input.allowUnpaid)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Explicitly allow an unpaid reservation before creating a stay with an outstanding balance.",
    });
  if (input.createPaymentLink && summary.balanceDue < 0.5)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "A website payment link requires at least $0.50 outstanding. Create this stay without a payment link.",
    });
  return { ...amounts, ...summary };
}

function ownerResult(
  booking: typeof bookings.$inferSelect,
  alreadyCreated: boolean,
  token?: string,
  error?: string
) {
  return {
    bookingId: booking.id,
    hostawayReservationId: booking.hostawayReservationId,
    status:
      booking.status === "confirmed"
        ? ("confirmed" as const)
        : booking.status === "failed"
          ? ("failed" as const)
          : ("pending" as const),
    ...ownerPaymentSummary(
      Number(booking.totalAmount),
      Number(booking.paidAmount ?? 0)
    ),
    token,
    alreadyCreated,
    error: error ?? booking.ownerCreateError ?? undefined,
  };
}

/** A locked canonical booking ensures only one active balance token can be issued. */
export async function createOwnerPaymentLink(
  bookingId: number,
  expiryDays = 7
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .for("update");
    if (
      !booking ||
      booking.bookingSource !== "owner" ||
      booking.status !== "confirmed" ||
      !booking.hostawayReservationId
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Only an active, confirmed owner reservation can have a balance link.",
      });
    }
    const balanceDue = ownerPaymentSummary(
      Number(booking.totalAmount),
      Number(booking.paidAmount ?? 0)
    ).balanceDue;
    if (balanceDue < 0.5)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "There is no collectable outstanding balance (minimum $0.50).",
      });
    const receipts = await tx
      .select()
      .from(ownerBookingPayments)
      .where(eq(ownerBookingPayments.bookingId, bookingId));
    if (receipts.some(receipt => receipt.hostawaySyncStatus !== "synced"))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Synchronize recorded receipts with Hostaway before collecting more funds.",
      });
    const state = await getHostawayOwnerPaymentState(
      booking.hostawayReservationId
    );
    if (
      state.cancelled ||
      state.hasScheduledCollection ||
      cent(state.remainingBalance) !== cent(balanceDue)
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Hostaway balance or scheduled collection has changed. Review payments in Hostaway before using a website balance link. Use only one collection channel.",
      });
    }
    const existing = await tx
      .select()
      .from(manualBookingLinks)
      .where(eq(manualBookingLinks.bookingId, bookingId));
    // Revoking a website token does not expire a Stripe URL already opened by a guest.
    // Check every unrecorded Checkout, not just currently active website tokens.
    const sessionStates = new Map<string, Stripe.Checkout.Session>();
    const unrecorded = existing.filter(
      link =>
        link.stripeCheckoutSessionId &&
        !receipts.some(
          receipt =>
            receipt.stripeCheckoutSessionId === link.stripeCheckoutSessionId
        )
    );
    if (unrecorded.length) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-04-22.dahlia",
      });
      for (const link of unrecorded) {
        const session = await stripe.checkout.sessions.retrieve(
          link.stripeCheckoutSessionId!
        );
        if (
          session.metadata?.owner_booking_id !== String(bookingId) ||
          session.metadata?.manual_booking_token !== link.token ||
          session.amount_total !== cent(Number(link.totalAmount))
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "An earlier Stripe checkout does not match this owner reservation. Review it before collecting again.",
          });
        }
        sessionStates.set(link.token, session);
        if (session.status === "expired" && session.payment_status !== "paid")
          continue;
        if (
          session.status === "open" &&
          session.payment_status !== "paid" &&
          link.status === "active" &&
          link.expiresAt > Date.now() &&
          cent(Number(link.totalAmount)) === cent(balanceDue)
        )
          continue;
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "An earlier balance checkout is still open or needs payment reconciliation. Review it in Stripe before issuing another link.",
        });
      }
    }
    for (const link of existing) {
      if (link.status !== "active") continue;
      if (
        link.expiresAt > Date.now() &&
        cent(Number(link.totalAmount)) === cent(balanceDue) &&
        (!link.stripeCheckoutSessionId ||
          sessionStates.get(link.token)?.status === "open")
      )
        return { token: link.token, expiresAt: link.expiresAt, balanceDue };
      // Do not silently replace a token that may have an outstanding payment session.
      if (
        link.stripeCheckoutSessionId &&
        sessionStates.get(link.token)?.status !== "expired"
      )
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "An existing balance checkout must be reviewed or expired before creating another payment link.",
        });
      await tx
        .update(manualBookingLinks)
        .set({ status: "expired" })
        .where(eq(manualBookingLinks.id, link.id));
    }
    const [property] = await tx
      .select()
      .from(properties)
      .where(eq(properties.slug, booking.propertyId))
      .limit(1);
    const audit = JSON.parse(booking.message ?? "{}") as Record<string, any>;
    const token = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + expiryDays * dayMs;
    await tx.insert(manualBookingLinks).values({
      token,
      propertySlug: booking.propertyId,
      propertyName: property?.name ?? booking.propertyId,
      hostawayListingId: booking.hostawayListingId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      guestCount: booking.guestCount,
      nightlyRate: "0",
      cleaningFee: "0",
      discountAmount: "0",
      extraGuestFee: "0",
      taxAmount: "0",
      totalAmount: balanceDue.toFixed(2),
      customLineItems: JSON.stringify([
        { label: "Remaining reservation balance", amount: balanceDue },
      ]),
      bookingId,
      hostawayReservationId: booking.hostawayReservationId,
      bypassAvailabilityCheck: 1, // Its own existing reservation blocks these dates. Checkout separately validates this reference.
      bypassCameraDisclosure: audit.bypassCameraDisclosure ? 1 : 0,
      bypassGuestCount: audit.bypassGuestCount ? 1 : 0,
      bypassTermsAcceptance: audit.bypassTermsAcceptance ? 1 : 0,
      bypassIdUpload: audit.bypassIdUpload ? 1 : 0,
      securityDepositOverride: booking.depositHoldAmount ?? "0",
      guestNote: `This reservation already exists. Reservation total $${Number(booking.totalAmount).toFixed(2)}; received $${Number(booking.paidAmount ?? 0).toFixed(2)}; balance due $${balanceDue.toFixed(2)}. ${audit.guestNote ?? ""}`,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      expiresAt,
      status: "active",
    });
    return { token, expiresAt, balanceDue };
  });
}

/** Creates one real reservation, without requiring website payment first (owner only). */
export async function createOwnerBooking(
  input: OwnerBookingInput,
  ownerIdentity: string
) {
  const amounts = validateOwnerBooking(input);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const [existing] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.ownerRequestKey, input.requestKey))
    .limit(1);
  if (existing) {
    if (existing.ownerRequestHash !== hash)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This creation request was already submitted with different details. Review the existing booking first.",
      });
    if (existing.status === "pending") {
      try {
        const recovered = await findHostawayOwnerReservation({
          requestKey: input.requestKey,
          hostawayListingId: existing.hostawayListingId,
          guestEmail: existing.guestEmail,
          checkIn: dateOnly(existing.checkIn),
          checkOut: dateOnly(existing.checkOut),
        });
        if (
          recovered &&
          ["new", "confirmed", "modified"].includes(recovered.status)
        ) {
          await db
            .update(bookings)
            .set({
              hostawayReservationId: recovered.id,
              status: "confirmed",
              ownerCreateError: null,
            })
            .where(
              and(eq(bookings.id, existing.id), eq(bookings.status, "pending"))
            );
          const receipts = await db
            .select()
            .from(ownerBookingPayments)
            .where(eq(ownerBookingPayments.bookingId, existing.id));
          for (const receipt of receipts)
            if (receipt.hostawaySyncStatus !== "synced")
              await syncOwnerReceiptToHostaway(receipt.id);
        } else if (
          recovered &&
          ["cancelled", "canceled"].includes(recovered.status)
        ) {
          await db
            .update(bookings)
            .set({
              hostawayReservationId: recovered.id,
              status: "cancelled",
              ownerCreateError:
                "The original Hostaway reservation was canceled. It has not been recreated.",
            })
            .where(
              and(eq(bookings.id, existing.id), eq(bookings.status, "pending"))
            );
        }
      } catch (error) {
        await db
          .update(bookings)
          .set({
            ownerCreateError: `${(error as Error).message} No reservation POST was repeated.`,
          })
          .where(eq(bookings.id, existing.id));
      }
    }
    const [current] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, existing.id))
      .limit(1);
    const [link] = await db
      .select()
      .from(manualBookingLinks)
      .where(
        and(
          eq(manualBookingLinks.bookingId, existing.id),
          eq(manualBookingLinks.status, "active")
        )
      )
      .limit(1);
    return ownerResult(current, true, link?.token);
  }
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, input.propertySlug))
    .limit(1);
  const hostawayId =
    property?.hostawayListingId ?? PROPERTY_TO_HOSTAWAY_ID[input.propertySlug];
  if (
    !property ||
    !hostawayId ||
    (input.hostawayListingId && input.hostawayListingId !== hostawayId)
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a valid property connected to Hostaway.",
    });
  if (input.guestCount > property.guests)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This property permits at most ${property.guests} guests.`,
    });
  const calendar = await getPropertyCalendar(
    input.propertySlug,
    dateOnly(input.checkIn),
    dateOnly(input.checkOut)
  );
  const occupied = [] as string[];
  for (let ms = input.checkIn; ms < input.checkOut; ms += dayMs) {
    const date = dateOnly(ms);
    const day = calendar.find(day => day.date === date);
    if (!day || !day.isAvailable || day.status !== "available")
      occupied.push(date);
  }
  if (occupied.length)
    throw new TRPCError({
      code: "CONFLICT",
      message: `Dates are unavailable or unverified: ${occupied.join(", ")}. No reservation was created.`,
    });
  const overlaps = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, input.propertySlug),
        inArray(bookings.status, ["paid", "confirmed"]),
        lt(bookings.checkIn, input.checkOut),
        gt(bookings.checkOut, input.checkIn)
      )
    )
    .limit(1);
  if (overlaps.length)
    throw new TRPCError({
      code: "CONFLICT",
      message: "These dates overlap an existing website reservation.",
    });
  const [setting] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "securityDepositAmount"))
    .limit(1);
  const deposit =
    input.securityDepositOverride ?? Number(setting?.value ?? 500);
  if (!Number.isFinite(deposit) || deposit < 0)
    throw new Error("Invalid security deposit configuration");
  const snapshot = [
    ...(input.extraGuestFee > 0
      ? [{ name: "Extra guest fee", price: input.extraGuestFee }]
      : []),
    ...(input.customLineItems ?? []).map(item => ({
      name: item.label,
      price: item.amount,
    })),
  ];
  let bookingId: number;
  let initialPaymentId: number | undefined;
  try {
    bookingId = await db.transaction(async tx => {
      const [insert] = await tx.insert(bookings).values({
        propertyId: property.slug,
        hostawayListingId: hostawayId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone ?? null,
        guestCount: input.guestCount,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights: input.nights,
        nightlyRate: input.nightlyRate.toFixed(2),
        subtotal: amounts.subtotal.toFixed(2),
        cleaningFee: input.cleaningFee.toFixed(2),
        taxAmount: input.taxAmount.toFixed(2),
        taxRate: "0",
        totalAmount: amounts.totalAmount.toFixed(2),
        bookingSource: "owner",
        paidAmount: input.amountReceived.toFixed(2),
        externalPaymentReference: input.paymentReference ?? null,
        ownerRequestKey: input.requestKey,
        ownerRequestHash: hash,
        ownerCreatedBy: ownerIdentity.slice(0, 128),
        status: "pending",
        depositHoldAmount: deposit.toFixed(2),
        depositHoldStatus: deposit > 0 ? "pending" : null,
        addonsSnapshot: JSON.stringify(snapshot),
        discountCodeId: input.discountCodeId ?? null,
        discountCodeLabel:
          input.discountLabel ??
          (input.discountAmount ? "Owner nightly discount" : null),
        discountCodeAmount: input.discountAmount.toFixed(2),
        message: JSON.stringify({
          guestNote: input.guestNote,
          adminNotes: input.adminNotes,
          bypassCameraDisclosure: input.bypassCameraDisclosure,
          bypassGuestCount: input.bypassGuestCount,
          bypassTermsAcceptance: input.bypassTermsAcceptance,
          bypassIdUpload: input.bypassIdUpload,
          initialAmountReceived: input.amountReceived,
          paymentReference: input.paymentReference,
        }),
      });
      const id = Number(insert.insertId);
      if (input.amountReceived > 0) {
        const [payment] = await tx.insert(ownerBookingPayments).values({
          bookingId: id,
          eventKey: `initial:${input.requestKey}`,
          amount: input.amountReceived.toFixed(2),
          method: "external",
          reference: input.paymentReference!,
        });
        initialPaymentId = Number(payment.insertId);
      }
      return id;
    });
  } catch (error: any) {
    const [duplicate] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.ownerRequestKey, input.requestKey))
      .limit(1);
    if (duplicate && duplicate.ownerRequestHash === hash)
      return ownerResult(duplicate, true);
    throw error;
  }
  let hostawayReservationId: string;
  try {
    const reservation = await createHostawayOwnerReservation({
      hostawayListingId: hostawayId,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      checkIn: dateOnly(input.checkIn),
      checkOut: dateOnly(input.checkOut),
      adults: input.guestCount,
      totalPrice: amounts.totalAmount,
      cleaningFee: input.cleaningFee,
      taxAmount: input.taxAmount,
      requestKey: input.requestKey,
      message: input.guestNote,
      hostNote: `Owner-created manual stay. Total $${amounts.totalAmount.toFixed(2)}. Attested external receipt $${input.amountReceived.toFixed(2)}. Balance $${amounts.balanceDue.toFixed(2)}.\n${JSON.stringify(snapshot)}\n${input.adminNotes ?? ""}`,
    });
    hostawayReservationId = reservation.id;
    await db
      .update(bookings)
      .set({ hostawayReservationId })
      .where(eq(bookings.id, bookingId));
    if (!["new", "confirmed", "modified"].includes(reservation.status))
      throw new Error(
        "Hostaway did not accept this as an active reservation. Review it in Hostaway before creating another."
      );
    await db
      .update(bookings)
      .set({ hostawayReservationId, status: "confirmed" })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")));
  } catch (error) {
    // Preserve pending state on uncertainty. Never retry a possibly accepted POST automatically.
    const message = `${(error as Error).message} This creation request will not be sent again. Check Hostaway and contact the owner for reconciliation before starting a new request.`;
    await db
      .update(bookings)
      .set({ ownerCreateError: message })
      .where(eq(bookings.id, bookingId));
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    return ownerResult(booking, false, undefined, message);
  }
  let warning: string | undefined;
  if (initialPaymentId) {
    try {
      await syncOwnerReceiptToHostaway(initialPaymentId);
    } catch {
      warning =
        "Reservation created and received funds recorded. Hostaway receipt synchronization needs review; do not collect the same funds again.";
    }
  }
  let token: string | undefined;
  if (input.createPaymentLink) {
    try {
      token = (await createOwnerPaymentLink(bookingId, input.expiryDays)).token;
    } catch (error) {
      warning = `Reservation created. Payment link not created: ${(error as Error).message}`;
    }
  }
  if (warning)
    await db
      .update(bookings)
      .set({ ownerCreateError: warning })
      .where(eq(bookings.id, bookingId));
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return ownerResult(booking, false, token, warning);
}
