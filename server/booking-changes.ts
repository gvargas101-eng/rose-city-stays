import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { getPropertyCalendar, PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";
import {
  cancelHostawayReservation,
  createHostawayReservation,
  quoteHostawayStay,
  recordHostawayStripePayment,
  updateHostawayReservationForStayChange,
  type HostawayPriceComponent,
} from "./hostaway-booking";
import { bookingChanges, bookings } from "../drizzle/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
const DAY_MS = 86_400_000;

type SettlementChoice = "refund" | "credit";

function asDateOnly(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(start: number, end: number) {
  return Math.round((end - start) / DAY_MS);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function componentTotal(component: HostawayPriceComponent) {
  const amount = Number(component.total ?? component.value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function changeBreakdown(components: HostawayPriceComponent[], total: number, nights: number) {
  const included = components.filter(component => component.isIncludedInTotalPrice !== 0);
  const subtotal = included
    .filter(component => component.type === "accommodation" || component.name === "baseRate")
    .reduce((sum, component) => sum + componentTotal(component), 0);
  const cleaningFee = included
    .filter(component => component.name === "cleaningFee")
    .reduce((sum, component) => sum + componentTotal(component), 0);
  const taxAmount = included
    .filter(component => component.type === "tax")
    .reduce((sum, component) => sum + componentTotal(component), 0);
  const reconciledSubtotal = subtotal > 0 ? subtotal : Math.max(0, total - cleaningFee - taxAmount);
  return {
    subtotal: roundMoney(reconciledSubtotal),
    nightlyRate: roundMoney(reconciledSubtotal / nights),
    cleaningFee: roundMoney(cleaningFee),
    taxAmount: roundMoney(taxAmount),
    taxRate: reconciledSubtotal > 0 ? roundMoney(taxAmount / reconciledSubtotal) : 0,
  };
}

async function getConfirmedBooking(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking?.hostawayReservationId) throw new Error("This booking has no Hostaway reservation to change");
  if (booking.status !== "confirmed") throw new Error("Only confirmed bookings can be changed");
  return { db, booking };
}

/**
 * Checks the destination listing directly in Hostaway. When dates overlap the
 * booking being changed on the same listing, its own dates are ignored so the
 * current reservation does not incorrectly block the move.
 */
async function assertChangeAvailability(
  booking: typeof bookings.$inferSelect,
  propertyId: string,
  newCheckIn: number,
  newCheckOut: number,
) {
  if (newCheckOut <= newCheckIn) throw new Error("New check-out must be after new check-in");
  const listingId = PROPERTY_TO_HOSTAWAY_ID[propertyId];
  if (!listingId) throw new Error("The selected destination property is not connected to Hostaway");

  const start = asDateOnly(newCheckIn);
  const end = asDateOnly(newCheckOut);
  const days = await getPropertyCalendar(propertyId, start, end);
  const originalStart = asDateOnly(booking.checkIn);
  const originalEnd = asDateOnly(booking.checkOut);
  const blocked = days.filter(day => {
    const overlapsOriginalReservation = propertyId === booking.propertyId && day.date >= originalStart && day.date < originalEnd;
    return day.date >= start && day.date < end && !overlapsOriginalReservation && (!day.isAvailable || day.status !== "available");
  });
  if (blocked.length) throw new Error(`The revised stay is unavailable on ${blocked.map(day => day.date).join(", ")}`);
  return listingId;
}

async function quoteChange(
  bookingId: number,
  propertyId: string,
  newCheckIn: number,
  newCheckOut: number,
  priceAdjustment = 0,
) {
  if (!Number.isFinite(priceAdjustment) || Math.abs(priceAdjustment) > 100_000) {
    throw new Error("Price adjustment must be between -$100,000.00 and $100,000.00");
  }
  const { booking } = await getConfirmedBooking(bookingId);
  const listingId = await assertChangeAvailability(booking, propertyId, newCheckIn, newCheckOut);
  const newNights = daysBetween(newCheckIn, newCheckOut);
  const quote = await quoteHostawayStay({
    hostawayListingId: listingId,
    checkIn: asDateOnly(newCheckIn),
    checkOut: asDateOnly(newCheckOut),
    guestCount: booking.guestCount,
  });
  const hostawayQuotedTotal = roundMoney(quote.totalPrice);
  const normalizedAdjustment = roundMoney(priceAdjustment);
  const revisedTotal = roundMoney(hostawayQuotedTotal + normalizedAdjustment);
  if (revisedTotal < 0) throw new Error("The price adjustment cannot reduce the revised stay below $0.00");
  const originalTotal = Number(booking.totalAmount);
  const creditApplied = roundMoney(Math.min(originalTotal, revisedTotal));
  const balanceDue = roundMoney(Math.max(0, revisedTotal - originalTotal));
  const refundAmount = roundMoney(Math.max(0, originalTotal - revisedTotal));
  return {
    booking,
    listingId,
    newNights,
    hostawayQuotedTotal,
    priceAdjustment: normalizedAdjustment,
    total: revisedTotal,
    components: quote.components,
    originalTotal,
    creditApplied,
    balanceDue,
    refundAmount,
  };
}

async function createGuestPaymentLink(change: typeof bookingChanges.$inferSelect, booking: typeof bookings.$inferSelect, origin: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(booking.stripeCustomerId ? { customer: booking.stripeCustomerId } : { customer_email: booking.guestEmail }),
    success_url: `${origin}/booking/change-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/bookings`,
    metadata: { changeId: String(change.id), type: "booking_change" },
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `Reservation change — Booking #${booking.id}` },
        unit_amount: Math.round(Number(change.balanceDue) * 100),
      },
      quantity: 1,
    }],
  });
  if (!session.url) throw new Error("Stripe did not return a payment link");
  const db = await getDb();
  await db?.update(bookingChanges).set({
    status: "payment_link_sent",
    stripeCheckoutSessionId: session.id,
  }).where(eq(bookingChanges.id, change.id));
  return session.url;
}

/**
 * Applies a fully settled change. For a property move, Hostaway requires a
 * replacement reservation (listingMapId cannot be changed in-place). The
 * replacement is created first; the original is cancelled only after payment
 * records have been attached successfully.
 */
async function finalizeChange(changeId: number, paymentIntentId: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [change] = await db.select().from(bookingChanges).where(eq(bookingChanges.id, changeId)).limit(1);
  if (!change) throw new Error("Reservation change not found");
  if (change.status === "completed") return { change, alreadyCompleted: true };
  if (change.status !== "quoted" && change.status !== "payment_link_sent") {
    throw new Error(`This reservation change cannot be finalized (${change.status})`);
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, change.bookingId)).limit(1);
  if (!booking?.hostawayReservationId || booking.status !== "confirmed") {
    throw new Error("The original confirmed booking is no longer available to change");
  }

  const listingId = await assertChangeAvailability(booking, change.newPropertyId, change.newCheckIn, change.newCheckOut);
  const newNights = daysBetween(change.newCheckIn, change.newCheckOut);
  const quote = await quoteHostawayStay({
    hostawayListingId: listingId,
    checkIn: asDateOnly(change.newCheckIn),
    checkOut: asDateOnly(change.newCheckOut),
    guestCount: booking.guestCount,
  });
  if (roundMoney(quote.totalPrice) !== roundMoney(Number(change.hostawayQuotedTotal))) {
    throw new Error("Hostaway price changed since the quote. Refresh the quote before confirming this change.");
  }
  const revisedTotal = roundMoney(quote.totalPrice + Number(change.priceAdjustment));
  if (revisedTotal < 0) throw new Error("The price adjustment cannot reduce the revised stay below $0.00");
  const breakdown = changeBreakdown(quote.components, quote.totalPrice, newNights);
  const isSameProperty = booking.propertyId === change.newPropertyId;
  let replacementReservationId: string | null = null;
  let originalCancelled = false;

  try {
    if (isSameProperty) {
      await updateHostawayReservationForStayChange({
        reservationId: booking.hostawayReservationId,
        hostawayListingId: listingId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        guestCount: booking.guestCount,
        newCheckIn: asDateOnly(change.newCheckIn),
        newCheckOut: asDateOnly(change.newCheckOut),
        totalPrice: revisedTotal,
      });
      replacementReservationId = booking.hostawayReservationId;
      if (Number(change.balanceDue) > 0) {
        if (!paymentIntentId) throw new Error("The additional payment is missing its Stripe payment intent");
        await recordHostawayStripePayment({
          reservationId: booking.hostawayReservationId,
          amount: Number(change.balanceDue),
          stripePaymentIntentId: paymentIntentId,
        });
      }
    } else {
      const replacement = await createHostawayReservation({
        hostawayListingId: listingId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone ?? undefined,
        checkIn: asDateOnly(change.newCheckIn),
        checkOut: asDateOnly(change.newCheckOut),
        adults: booking.guestCount,
        totalPrice: revisedTotal,
        message: `Replacement for Hostaway reservation #${booking.hostawayReservationId}. Original website payment applied as credit.${Number(change.priceAdjustment) ? ` Owner price adjustment: $${Number(change.priceAdjustment).toFixed(2)}${change.adjustmentReason ? ` (${change.adjustmentReason})` : ""}.` : ""}`,
        stripePaymentIntentId: booking.stripePaymentIntentId ?? paymentIntentId ?? `booking-change-${change.id}`,
      });
      replacementReservationId = replacement.id;

      // The original website payment is attached to the replacement first. A
      // new Stripe payment is only recorded for a positive balance due.
      if (Number(change.creditApplied) > 0) {
        await recordHostawayStripePayment({
          reservationId: replacement.id,
          amount: Number(change.creditApplied),
          stripePaymentIntentId: booking.stripePaymentIntentId ?? `booking-change-credit-${change.id}`,
        });
      }
      if (Number(change.balanceDue) > 0) {
        if (!paymentIntentId) throw new Error("The additional payment is missing its Stripe payment intent");
        await recordHostawayStripePayment({
          reservationId: replacement.id,
          amount: Number(change.balanceDue),
          stripePaymentIntentId: paymentIntentId,
        });
      }

      await cancelHostawayReservation(booking.hostawayReservationId);
      originalCancelled = true;
    }
    if (!replacementReservationId) throw new Error("Hostaway did not return a reservation identifier for the changed stay");

    const settlement = Number(change.refundAmount) > 0
      ? (change.settlement === "credit_retained" ? "credit_retained" : "refund_pending")
      : Number(change.balanceDue) > 0 ? "paid" : "none";
    await db.update(bookings).set({
      propertyId: change.newPropertyId,
      hostawayListingId: listingId,
      checkIn: change.newCheckIn,
      checkOut: change.newCheckOut,
      nights: newNights,
      subtotal: String(breakdown.subtotal),
      nightlyRate: String(breakdown.nightlyRate),
      cleaningFee: String(breakdown.cleaningFee),
      taxAmount: String(breakdown.taxAmount),
      taxRate: String(breakdown.taxRate),
      totalAmount: String(revisedTotal),
      addonsSnapshot: Number(change.priceAdjustment)
        ? JSON.stringify([{ name: change.adjustmentReason ? `Stay change adjustment — ${change.adjustmentReason}` : "Stay change adjustment", price: Number(change.priceAdjustment) }])
        : null,
      hostawayReservationId: replacementReservationId,
    }).where(eq(bookings.id, booking.id));
    await db.update(bookingChanges).set({
      replacementHostawayReservationId: replacementReservationId,
      status: "completed",
      settlement,
      stripePaymentIntentId: paymentIntentId,
      failureReason: null,
    }).where(eq(bookingChanges.id, change.id));

    await notifyOwner({
      title: `Reservation changed — ${booking.guestName}`,
      content: [
        `Booking #${booking.id}`,
        `Old Hostaway reservation: #${booking.hostawayReservationId} (${change.originalPropertyId}, ${asDateOnly(change.originalCheckIn)} – ${asDateOnly(change.originalCheckOut)})`,
        `${isSameProperty ? "Updated" : "New"} Hostaway reservation: #${replacementReservationId} (${change.newPropertyId}, ${asDateOnly(change.newCheckIn)} – ${asDateOnly(change.newCheckOut)})`,
        `Hostaway quoted total: $${Number(change.hostawayQuotedTotal).toFixed(2)}`,
        Number(change.priceAdjustment) ? `Owner price adjustment: $${Number(change.priceAdjustment).toFixed(2)}${change.adjustmentReason ? ` (${change.adjustmentReason})` : ""}` : null,
        `Revised total: $${revisedTotal.toFixed(2)}`,
        `Original payment credit: $${Number(change.creditApplied).toFixed(2)}`,
        Number(change.balanceDue) > 0 ? `Additional payment: $${Number(change.balanceDue).toFixed(2)}` : null,
        Number(change.refundAmount) > 0 ? `Refund/credit remaining: $${Number(change.refundAmount).toFixed(2)} (${settlement.replaceAll("_", " ")})` : null,
      ].filter(Boolean).join("\n"),
    });
    return { changeId: change.id, status: "completed" as const, settlement, replacementReservationId };
  } catch (error) {
    // Do not leave an extra destination reservation if the original booking is
    // still intact. If Hostaway already cancelled the original, preserve the
    // replacement and surface the exact failure for owner review.
    if (!isSameProperty && replacementReservationId && !originalCancelled) {
      try { await cancelHostawayReservation(replacementReservationId); } catch { /* retain the primary failure */ }
    }
    await db.update(bookingChanges).set({
      status: "failed",
      failureReason: String(error).slice(0, 1000),
      replacementHostawayReservationId: originalCancelled ? replacementReservationId : null,
    }).where(eq(bookingChanges.id, changeId));
    throw error;
  }
}

export async function quoteBookingChange(params: { bookingId: number; propertyId: string; newCheckIn: number; newCheckOut: number; priceAdjustment?: number }) {
  const quote = await quoteChange(params.bookingId, params.propertyId, params.newCheckIn, params.newCheckOut, params.priceAdjustment);
  return {
    propertyId: params.propertyId,
    newCheckIn: params.newCheckIn,
    newCheckOut: params.newCheckOut,
    newNights: quote.newNights,
    originalTotal: quote.originalTotal,
    hostawayQuotedTotal: quote.hostawayQuotedTotal,
    priceAdjustment: quote.priceAdjustment,
    revisedTotal: quote.total,
    creditApplied: quote.creditApplied,
    balanceDue: quote.balanceDue,
    refundAmount: quote.refundAmount,
  };
}

export async function createBookingChange(params: {
  bookingId: number;
  propertyId: string;
  newCheckIn: number;
  newCheckOut: number;
  priceAdjustment?: number;
  adjustmentReason?: string;
  settlementChoice: SettlementChoice;
  origin: string;
}) {
  const quote = await quoteChange(params.bookingId, params.propertyId, params.newCheckIn, params.newCheckOut, params.priceAdjustment);
  const { db, booking } = await getConfirmedBooking(params.bookingId);
  const [existing] = await db.select().from(bookingChanges).where(and(
    eq(bookingChanges.bookingId, booking.id),
    eq(bookingChanges.newPropertyId, params.propertyId),
    eq(bookingChanges.newCheckIn, params.newCheckIn),
    eq(bookingChanges.newCheckOut, params.newCheckOut),
    eq(bookingChanges.priceAdjustment, String(quote.priceAdjustment)),
  )).limit(1);
  if (existing && ["quoted", "payment_link_sent", "completed"].includes(existing.status)) {
    throw new Error(`This reservation change already exists (${existing.status.replaceAll("_", " ")})`);
  }

  const inserted = await db.insert(bookingChanges).values({
    bookingId: booking.id,
    originalHostawayReservationId: booking.hostawayReservationId!,
    originalPropertyId: booking.propertyId,
    newPropertyId: params.propertyId,
    originalCheckIn: booking.checkIn,
    originalCheckOut: booking.checkOut,
    newCheckIn: params.newCheckIn,
    newCheckOut: params.newCheckOut,
    originalTotalAmount: String(quote.originalTotal),
    hostawayQuotedTotal: String(quote.hostawayQuotedTotal),
    priceAdjustment: String(quote.priceAdjustment),
    adjustmentReason: params.adjustmentReason?.trim().slice(0, 256) || null,
    newTotalAmount: String(quote.total),
    creditApplied: String(quote.creditApplied),
    balanceDue: String(quote.balanceDue),
    refundAmount: String(quote.refundAmount),
    settlement: quote.refundAmount > 0 && params.settlementChoice === "credit" ? "credit_retained" : "none",
  }).$returningId();
  const changeId = inserted[0].id;
  const [change] = await db.select().from(bookingChanges).where(eq(bookingChanges.id, changeId)).limit(1);
  if (!change) throw new Error("Reservation change could not be saved");

  if (quote.balanceDue > 0) {
    const paymentUrl = await createGuestPaymentLink(change, booking, params.origin);
    return { changeId, status: "payment_link_sent" as const, paymentUrl, refundAmount: 0 };
  }

  const result = await finalizeChange(changeId, null);
  return { changeId, status: result.status, paymentUrl: null, refundAmount: quote.refundAmount, settlement: result.settlement };
}

export async function confirmBookingChangeCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") throw new Error(`Reservation change Checkout is not paid: ${session.payment_status}`);
  const changeId = Number(session.metadata?.changeId);
  if (!changeId) throw new Error("Reservation change Checkout is missing its change ID");
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (!paymentIntentId) throw new Error("Reservation change Checkout is missing its payment intent");
  return finalizeChange(changeId, paymentIntentId);
}

/** Issues a specific, owner-confirmed Stripe refund after a lower-priced change. */
export async function refundBookingChange(changeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [change] = await db.select().from(bookingChanges).where(eq(bookingChanges.id, changeId)).limit(1);
  if (!change) throw new Error("Reservation change not found");
  if (change.status !== "completed" || change.settlement !== "refund_pending") {
    throw new Error("This reservation change has no refund awaiting approval");
  }
  if (Number(change.refundAmount) <= 0) throw new Error("This reservation change has no refundable balance");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, change.bookingId)).limit(1);
  if (!booking?.stripePaymentIntentId) throw new Error("The original Stripe payment is unavailable for a refund");

  const refund = await stripe.refunds.create({
    payment_intent: booking.stripePaymentIntentId,
    amount: Math.round(Number(change.refundAmount) * 100),
    reason: "requested_by_customer",
    metadata: { bookingChangeId: String(change.id), bookingId: String(booking.id), type: "reservation_change" },
  });
  await db.update(bookingChanges).set({
    settlement: "refunded",
    stripeRefundId: refund.id,
  }).where(eq(bookingChanges.id, change.id));
  await notifyOwner({
    title: `Refund issued — ${booking.guestName}`,
    content: `A $${Number(change.refundAmount).toFixed(2)} Stripe refund was issued for booking #${booking.id} after a reservation change. Record the refund in Hostaway if you need it displayed in that reservation's payment timeline.`,
  });
  return { refundId: refund.id, amount: Number(change.refundAmount) };
}

export async function listBookingChanges(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(bookingChanges).where(eq(bookingChanges.bookingId, bookingId)).orderBy(bookingChanges.createdAt);
}
