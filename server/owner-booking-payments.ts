import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  bookings,
  manualBookingLinks,
  ownerBookingPayments,
  type Booking,
  type ManualBookingLink,
} from "../drizzle/schema";
import { getDb } from "./db";
import { settleOwnerDiscountClaim } from "./discount-claims";
import {
  getHostawayOwnerPaymentState,
  recordHostawayOwnerReceipt,
} from "./hostaway-booking";
import { notifyOwner } from "./_core/notification";

/** All settlement comparisons use integer cents. Credits change totalAmount, never paidAmount. */
function cents(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(Math.round(amount * 100))
  ) {
    throw new Error("Invalid owner reservation amount");
  }
  return Math.round(amount * 100);
}

export function getOwnerBookingBalance(
  booking: Pick<Booking, "totalAmount" | "paidAmount">
) {
  const total = cents(booking.totalAmount);
  const paid = cents(booking.paidAmount);
  return {
    originalReservationTotal: total / 100,
    amountPaid: paid / 100,
    balanceDue: Math.max(0, total - paid) / 100,
  };
}

/** A balance link is permission to pay an existing stay, not permission to create one. */
export function validateOwnerBalanceLink(
  booking: Booking,
  link: ManualBookingLink
) {
  if (
    booking.bookingSource !== "owner" ||
    link.bookingId !== booking.id ||
    !booking.hostawayReservationId ||
    link.hostawayReservationId !== booking.hostawayReservationId ||
    link.propertySlug !== booking.propertyId ||
    Number(link.checkIn) !== Number(booking.checkIn) ||
    Number(link.checkOut) !== Number(booking.checkOut)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This payment link does not match an existing owner reservation. Please contact the host.",
    });
  }
  if (booking.status !== "confirmed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This reservation is not confirmed or has been canceled. Please contact the host.",
    });
  }
  const balance = getOwnerBookingBalance(booking);
  if (cents(balance.balanceDue) < 50) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "There is no payable reservation balance (minimum $0.50).",
    });
  }
  if (cents(link.totalAmount) !== cents(balance.balanceDue)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "The reservation balance has changed. Please request an updated payment link from the host.",
    });
  }
  return balance;
}

export async function createOwnerBalanceCheckout(params: {
  stripe: Stripe;
  link: ManualBookingLink;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestIdUrl?: string;
  origin: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    // Canonical-booking lock serializes balance issuance with receipt settlement.
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.link.bookingId!))
      .limit(1)
      .for("update");
    const [link] = await tx
      .select()
      .from(manualBookingLinks)
      .where(eq(manualBookingLinks.id, params.link.id))
      .limit(1)
      .for("update");
    if (!booking || !link)
      throw new Error("Owner reservation or payment link not found");
    if (link.status !== "active" || Date.now() > link.expiresAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This booking link is no longer active or has expired",
      });
    }
    const balance = validateOwnerBalanceLink(booking, link);
    const amount = cents(balance.balanceDue);
    try {
      const state = await getHostawayOwnerPaymentState(
        booking.hostawayReservationId!
      );
      if (
        state.cancelled ||
        state.hasScheduledCollection ||
        cents(state.remainingBalance) !== amount
      ) {
        throw new Error("Hostaway balance or collection differs");
      }
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Hostaway balance/collection has changed. Review it in Hostaway before collecting through this website.",
      });
    }
    if (link.stripeCheckoutSessionId) {
      const existing = await params.stripe.checkout.sessions.retrieve(
        link.stripeCheckoutSessionId
      );
      if (
        existing.metadata?.owner_booking_id !== String(booking.id) ||
        existing.metadata?.manual_booking_token !== link.token ||
        existing.amount_total !== amount
      ) {
        throw new Error(
          "Stored Checkout session does not match this reservation balance"
        );
      }
      if (
        existing.status !== "open" ||
        existing.payment_status === "paid" ||
        !existing.url
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This checkout is completed or expired. Please contact the host.",
        });
      }
      return { checkoutUrl: existing.url };
    }
    const session = await params.stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_creation: "always",
        customer_email: params.guestEmail,
        payment_intent_data: { setup_future_usage: "off_session" },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Remaining balance — ${link.propertyName}`,
                description:
                  "Payment for your existing reservation; no new reservation is created.",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${params.origin}/booking/manual-confirm?token=${link.token}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${params.origin}/booking/pay/${link.token}`,
        metadata: {
          owner_booking_id: String(booking.id),
          owner_balance_amount_cents: String(amount),
          manual_booking_token: link.token,
          guest_name: params.guestName,
          guest_email: params.guestEmail,
          guest_phone: params.guestPhone ?? "",
          guest_id_url: params.guestIdUrl ?? "",
          property_slug: link.propertySlug,
          property_name: link.propertyName,
        },
      },
      { idempotencyKey: `owner-balance-${link.token}` }
    );
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    await tx
      .update(manualBookingLinks)
      .set({ stripeCheckoutSessionId: session.id })
      .where(
        and(
          eq(manualBookingLinks.id, link.id),
          eq(manualBookingLinks.status, "active")
        )
      );
    return { checkoutUrl: session.url };
  });
}

/** Record the actual Stripe receipt exactly once. No Hostaway or card side effects occur in this transaction. */
export async function settleOwnerBookingCheckout(
  session: Stripe.Checkout.Session
) {
  if (session.payment_status !== "paid")
    throw new Error("Owner reservation Checkout session is not paid");
  const token = session.metadata?.manual_booking_token;
  const ownerId = Number(session.metadata?.owner_booking_id);
  if (!token || !Number.isSafeInteger(ownerId) || ownerId <= 0)
    throw new Error("Owner payment metadata is missing or invalid");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.transaction(async tx => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, ownerId))
      .limit(1)
      .for("update");
    const [link] = await tx
      .select()
      .from(manualBookingLinks)
      .where(eq(manualBookingLinks.token, token))
      .limit(1)
      .for("update");
    if (
      !booking ||
      booking.bookingSource !== "owner" ||
      !link ||
      link.bookingId !== booking.id ||
      !booking.hostawayReservationId ||
      link.hostawayReservationId !== booking.hostawayReservationId ||
      link.stripeCheckoutSessionId !== session.id
    ) {
      throw new Error(
        "Paid Checkout session does not match this existing owner reservation"
      );
    }
    const amount = cents(link.totalAmount);
    if (
      amount < 50 ||
      session.amount_total !== amount ||
      (session.currency && session.currency.toLowerCase() !== "usd") ||
      (session.metadata?.owner_balance_amount_cents &&
        session.metadata.owner_balance_amount_cents !== String(amount))
    ) {
      throw new Error(
        "Paid Checkout amount does not match the issued reservation balance"
      );
    }
    const eventKey = `stripe:${session.id}`;
    const [receipt] = await tx
      .select()
      .from(ownerBookingPayments)
      .where(eq(ownerBookingPayments.eventKey, eventKey))
      .limit(1);
    if (receipt) {
      if (
        receipt.bookingId !== booking.id ||
        cents(receipt.amount) !== amount ||
        receipt.stripeCheckoutSessionId !== session.id
      ) {
        throw new Error(
          "Existing owner receipt does not match the Checkout session"
        );
      }
      // Recover an active link only after the receipt is known to exist.
      await tx
        .update(manualBookingLinks)
        .set({ status: "paid" })
        .where(
          and(
            eq(manualBookingLinks.id, link.id),
            eq(manualBookingLinks.status, "active")
          )
        );
      return {
        alreadyConfirmed: true,
        booking,
        link,
        paymentId: receipt.id,
        fullyPaid: cents(booking.paidAmount) >= cents(booking.totalAmount),
      };
    }
    if (link.status === "paid")
      throw new Error("Paid owner link is missing its receipt ledger record");
    // Revocation/expiration/cancellation after payment issuance cannot erase money actually received.
    const reference =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? session.id);
    const [inserted] = await tx
      .insert(ownerBookingPayments)
      .values({
        bookingId: booking.id,
        eventKey,
        amount: (amount / 100).toFixed(2),
        method: "stripe",
        reference,
        stripeCheckoutSessionId: session.id,
        hostawaySyncStatus: "pending",
      })
      .$returningId();
    const paidAmount = ((cents(booking.paidAmount) + amount) / 100).toFixed(2);
    const customer =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    const updates = {
      paidAmount,
      stripePaymentIntentId: reference,
      stripeCheckoutSessionId: session.id,
      ...(!booking.stripeCustomerId && customer
        ? { stripeCustomerId: customer }
        : {}),
      ...(!booking.guestIdUrl && session.metadata?.guest_id_url
        ? { guestIdUrl: session.metadata.guest_id_url }
        : {}),
    };
    // Never write status here, especially for a canceled reservation receiving a late payment.
    await tx.update(bookings).set(updates).where(eq(bookings.id, booking.id));
    await tx
      .update(manualBookingLinks)
      .set({ status: "paid" })
      .where(
        and(
          eq(manualBookingLinks.id, link.id),
          eq(manualBookingLinks.status, "active")
        )
      );
    return {
      alreadyConfirmed: false,
      booking: { ...booking, ...updates },
      link,
      paymentId: inserted.id,
      fullyPaid: cents(paidAmount) >= cents(booking.totalAmount),
    };
  });
  // Financial receipt is committed first. Coupon ledger failures must not roll
  // back money received; the confirmation replay/helper safely retries counting.
  if (result.booking.discountCodeId) {
    try { await settleOwnerDiscountClaim(result.booking.id); }
    catch (error) {
      console.error("[Discount] Owner paid coupon settlement requires reconciliation:", String(error));
      try { await notifyOwner({ title: `Owner coupon usage reconciliation — Booking #${result.booking.id}`, content: `Payment is recorded and must NOT be collected again. Coupon usage could not be finalized; retry confirmation or reconcile the discount claim.\n\n${String(error)}` }); } catch { /* Coupon notification cannot erase money received. */ }
    }
  }
  // Receipt is durable before this retryable PMS operation. Failure never rolls back payment.
  try {
    await syncOwnerReceiptToHostaway(result.paymentId);
  } catch {
    /* Sync failure is marked and notified by the sync service; retain the settled receipt. */
  }
  return result;
}

export type OwnerReceiptSyncResult = {
  status: "synced" | "failed";
  paymentId: number;
  hostawayChargeId?: string | null;
  error?: string;
};

/** Retry safely: provider helper GETs existing charges by reference before POST, while the ledger lock serializes local retries. */
export async function syncOwnerReceiptToHostaway(
  paymentId: number
): Promise<OwnerReceiptSyncResult> {
  let failure: string | undefined;
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.transaction(async tx => {
      const [receipt] = await tx
        .select()
        .from(ownerBookingPayments)
        .where(eq(ownerBookingPayments.id, paymentId))
        .limit(1)
        .for("update");
      if (!receipt) throw new Error("Owner payment receipt not found");
      if (receipt.hostawaySyncStatus === "synced")
        return {
          status: "synced" as const,
          paymentId,
          hostawayChargeId: receipt.hostawayChargeId,
        };
      try {
        const [booking] = await tx
          .select()
          .from(bookings)
          .where(eq(bookings.id, receipt.bookingId))
          .limit(1);
        if (
          !booking ||
          booking.bookingSource !== "owner" ||
          !booking.hostawayReservationId
        )
          throw new Error(
            "Owner reservation is missing its Hostaway reservation ID"
          );
        if (receipt.method !== "stripe" && receipt.method !== "external")
          throw new Error("Invalid owner receipt method");
        if (cents(receipt.amount) <= 0)
          throw new Error(
            "Owner receipt must record actual positive money received"
          );
        const charge = await recordHostawayOwnerReceipt({
          reservationId: booking.hostawayReservationId,
          amount: Number(receipt.amount),
          reference: receipt.reference,
          method: receipt.method,
        });
        if (!charge.id || charge.status !== "paid")
          throw new Error("Hostaway did not confirm a paid receipt");
        await tx
          .update(ownerBookingPayments)
          .set({ hostawaySyncStatus: "synced", hostawayChargeId: charge.id })
          .where(eq(ownerBookingPayments.id, paymentId));
        return {
          status: "synced" as const,
          paymentId,
          hostawayChargeId: charge.id,
        };
      } catch (error) {
        failure = String(error);
        await tx
          .update(ownerBookingPayments)
          .set({ hostawaySyncStatus: "failed" })
          .where(eq(ownerBookingPayments.id, paymentId));
        return { status: "failed" as const, paymentId, error: failure };
      }
    });
    if (result.status === "synced") return result;
  } catch (error) {
    failure = String(error);
    // Best effort if a transaction/connection failed after the provider operation.
    try {
      const db = await getDb();
      await db
        ?.update(ownerBookingPayments)
        .set({ hostawaySyncStatus: "failed" })
        .where(
          and(
            eq(ownerBookingPayments.id, paymentId),
            eq(ownerBookingPayments.hostawaySyncStatus, "pending")
          )
        );
    } catch {
      /* A later retry rechecks provider references before posting. */
    }
  }
  try {
    await notifyOwner({
      title: `Hostaway receipt sync failed — Owner payment #${paymentId}`,
      content: `Money received remains recorded locally. Reconcile/retry owner payment receipt #${paymentId}; do not collect the payment again.\n\nError: ${failure ?? "Unknown sync failure"}`,
    });
  } catch {
    /* Notification failure cannot change receipt settlement. */
  }
  throw new Error(
    `Owner receipt #${paymentId} Hostaway sync failed. Money received remains recorded. ${failure ?? "Unknown sync failure"}`
  );
}
