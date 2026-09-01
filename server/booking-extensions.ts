import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { getPropertyCalendar } from "./hostaway";
import {
  quoteHostawayExtension,
  recordHostawayStripePayment,
  updateHostawayReservationForExtension,
} from "./hostaway-booking";
import { bookingExtensions, bookings } from "../drizzle/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

function asDateOnly(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(start: number, end: number) {
  return Math.round((end - start) / 86_400_000);
}

function paymentIntentId(value: Stripe.PaymentIntent | string | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function findCustomerId(booking: typeof bookings.$inferSelect): Promise<string | null> {
  if (booking.stripeCustomerId) return booking.stripeCustomerId;
  if (!booking.stripePaymentIntentId) return null;
  const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId, { expand: ["customer"] });
  const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null;
  if (customerId) {
    const db = await getDb();
    await db?.update(bookings).set({ stripeCustomerId: customerId }).where(eq(bookings.id, booking.id));
  }
  return customerId;
}

async function assertExtensionAvailability(booking: typeof bookings.$inferSelect, newCheckOut: number) {
  if (newCheckOut <= booking.checkOut) throw new Error("New check-out must be after the current check-out date");
  const start = asDateOnly(booking.checkOut);
  const end = asDateOnly(newCheckOut);
  const days = await getPropertyCalendar(booking.propertyId, start, end);
  const blocked = days.filter(day => day.date >= start && day.date < end && (!day.isAvailable || day.status !== "available"));
  if (blocked.length) throw new Error(`Extension is unavailable on ${blocked.map(day => day.date).join(", ")}`);
}

export async function quoteExtension(bookingId: number, newCheckOut: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking?.hostawayReservationId) throw new Error("This booking has no Hostaway reservation to extend");
  if (booking.status !== "confirmed") throw new Error("Only confirmed bookings can be extended");
  await assertExtensionAvailability(booking, newCheckOut);
  const quote = await quoteHostawayExtension({
    hostawayListingId: booking.hostawayListingId,
    checkIn: asDateOnly(booking.checkIn),
    currentCheckOut: asDateOnly(booking.checkOut),
    newCheckOut: asDateOnly(newCheckOut),
    guestCount: booking.guestCount,
  });
  return {
    booking,
    newCheckOut,
    additionalNights: daysBetween(booking.checkOut, newCheckOut),
    ...quote,
  };
}

async function createPaymentLink(extension: typeof bookingExtensions.$inferSelect, customerId: string | null, guestEmail: string, origin: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ...(customerId ? { customer: customerId } : { customer_email: guestEmail }),
    success_url: `${origin}/booking/extension-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/bookings`,
    metadata: { extensionId: String(extension.id), type: "booking_extension" },
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `Stay extension — Booking #${extension.bookingId}` },
        unit_amount: Math.round(Number(extension.amount) * 100),
      },
      quantity: 1,
    }],
  });
  const db = await getDb();
  await db?.update(bookingExtensions).set({
    status: "payment_link_sent",
    stripeCheckoutSessionId: session.id,
  }).where(eq(bookingExtensions.id, extension.id));
  return session.url!;
}

/**
 * Extends the Hostaway reservation first, then charges the authorized saved card.
 * If Stripe requires guest authentication or no saved card exists, it returns a
 * hosted payment link while retaining the extension as an unpaid PMS balance.
 */
export async function createAndCollectExtension(params: { bookingId: number; newCheckOut: number; origin: string }) {
  const quote = await quoteExtension(params.bookingId, params.newCheckOut);
  const { booking, extensionAmount, extendedTotal, additionalNights } = quote;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [existing] = await db.select().from(bookingExtensions).where(and(
    eq(bookingExtensions.bookingId, booking.id),
    eq(bookingExtensions.newCheckOut, params.newCheckOut),
  )).limit(1);
  if (existing && ["pending", "paid", "payment_link_sent"].includes(existing.status)) {
    throw new Error(`An extension through ${asDateOnly(params.newCheckOut)} already exists (${existing.status.replaceAll("_", " ")})`);
  }

  const inserted = await db.insert(bookingExtensions).values({
    bookingId: booking.id,
    hostawayReservationId: booking.hostawayReservationId!,
    previousCheckOut: booking.checkOut,
    newCheckOut: params.newCheckOut,
    additionalNights,
    amount: String(extensionAmount),
    hostawayNewTotal: String(extendedTotal),
  }).$returningId();
  const extensionId = inserted[0].id;

  try {
    await updateHostawayReservationForExtension({
      reservationId: booking.hostawayReservationId!,
      hostawayListingId: booking.hostawayListingId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      guestCount: booking.guestCount,
      checkIn: asDateOnly(booking.checkIn),
      newCheckOut: asDateOnly(params.newCheckOut),
      totalPrice: extendedTotal,
    });
    await db.update(bookings).set({
      checkOut: params.newCheckOut,
      nights: booking.nights + additionalNights,
      totalAmount: String(Math.round((Number(booking.totalAmount) + extensionAmount) * 100) / 100),
    }).where(eq(bookings.id, booking.id));
  } catch (error) {
    await db.update(bookingExtensions).set({ status: "failed", paymentError: String(error).slice(0, 1000) }).where(eq(bookingExtensions.id, extensionId));
    throw error;
  }

  const [extension] = await db.select().from(bookingExtensions).where(eq(bookingExtensions.id, extensionId)).limit(1);
  if (!extension) throw new Error("Extension record was not created");
  const customerId = await findCustomerId(booking);
  try {
    if (!customerId) throw new Error("No saved Stripe customer is available for this booking");
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    const paymentMethod = methods.data[0];
    if (!paymentMethod) throw new Error("No saved payment method is available for this booking");
    const payment = await stripe.paymentIntents.create({
      amount: Math.round(extensionAmount * 100),
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethod.id,
      confirm: true,
      off_session: true,
      description: `Stay extension — Booking #${booking.id}`,
      receipt_email: booking.guestEmail,
      metadata: { bookingId: String(booking.id), extensionId: String(extension.id), type: "booking_extension" },
    });
    if (payment.status !== "succeeded") throw new Error(`Stripe extension charge returned ${payment.status}`);
    const charge = await recordHostawayStripePayment({
      reservationId: booking.hostawayReservationId!,
      amount: extensionAmount,
      stripePaymentIntentId: payment.id,
    });
    await db.update(bookingExtensions).set({
      status: "paid",
      stripePaymentIntentId: payment.id,
      hostawayChargeId: charge.id,
      paymentError: null,
    }).where(eq(bookingExtensions.id, extension.id));
    return { extensionId: extension.id, paymentStatus: "paid" as const, paymentUrl: null };
  } catch (error) {
    const paymentUrl = await createPaymentLink(extension, customerId, booking.guestEmail, params.origin);
    await db.update(bookingExtensions).set({ paymentError: String(error).slice(0, 1000) }).where(eq(bookingExtensions.id, extension.id));
    return { extensionId: extension.id, paymentStatus: "payment_link_sent" as const, paymentUrl };
  }
}

export async function confirmExtensionCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") throw new Error(`Extension Checkout is not paid: ${session.payment_status}`);
  const extensionId = Number(session.metadata?.extensionId);
  if (!extensionId) throw new Error("Extension Checkout is missing its extension ID");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [extension] = await db.select().from(bookingExtensions).where(eq(bookingExtensions.id, extensionId)).limit(1);
  if (!extension) throw new Error("Extension not found");
  if (extension.status === "paid") return { extensionId, alreadyPaid: true };
  const paymentId = paymentIntentId(session.payment_intent);
  if (!paymentId) throw new Error("Extension Checkout is missing its payment intent");
  const charge = await recordHostawayStripePayment({
    reservationId: extension.hostawayReservationId,
    amount: Number(extension.amount),
    stripePaymentIntentId: paymentId,
  });
  await db.update(bookingExtensions).set({
    status: "paid",
    stripePaymentIntentId: paymentId,
    stripeCheckoutSessionId: session.id,
    hostawayChargeId: charge.id,
    paymentError: null,
  }).where(eq(bookingExtensions.id, extension.id));
  return { extensionId, alreadyPaid: false };
}
