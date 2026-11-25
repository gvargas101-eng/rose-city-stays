import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { bookings, discountCodes, discountCodeUses, discountCodeGuestOverrides, discountCodeClaims, type DiscountCode } from "../drizzle/schema";
import { getDb } from "./db";

export const normalizeDiscountEmail = (email: string) => email.trim().toLowerCase();
export const normalizeDiscountCode = (code: string) => code.trim().toUpperCase();
export type DiscountSelection = { code?: string; codeId?: number; guestEmail: string; propertyId?: string; nightlySubtotal: number };
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Reader = Db | Tx;
const unavailable = (message: string): never => { throw new TRPCError({ code: "BAD_REQUEST", message }); };

/** Always bounded by lodging; fees, tax, add-ons and deposit are not in this base. */
export function calculateNightlyDiscount(subtotal: number, type: "percent" | "fixed", value: number) {
  if (!Number.isFinite(subtotal) || subtotal <= 0 || !Number.isFinite(value) || value <= 0) unavailable("Invalid discount pricing.");
  return Math.min(Math.round(subtotal * 100), Math.max(0, Math.round((type === "percent" ? subtotal * value / 100 : value) * 100))) / 100;
}

export function assertDiscountEligibility(dc: DiscountCode, input: DiscountSelection, counts: { uses: number; pending: number; totalUses: number; totalPending: number; overrideLimit: number | null }, now = Date.now()) {
  if (!dc.isActive) unavailable("Invalid or inactive discount code.");
  if (dc.expiresAt !== null && now >= dc.expiresAt) unavailable("This discount code has expired.");
  if (dc.propertyRestrictions) {
    let allowed: unknown;
    try { allowed = JSON.parse(dc.propertyRestrictions); } catch { unavailable("This discount code's property restrictions need owner review."); }
    if (!Array.isArray(allowed) || allowed.some(p => typeof p !== "string")) unavailable("This discount code's property restrictions need owner review.");
    const properties = allowed as string[];
    if (properties.length && (!input.propertyId || !properties.includes(input.propertyId))) unavailable("This discount code is not valid for this property.");
  }
  const effectiveLimit = counts.overrideLimit ?? dc.maxUsesPerGuest;
  if (counts.uses + counts.pending >= effectiveLimit) unavailable(`This guest has reached the lifetime limit (${effectiveLimit}) or has a checkout in progress for this code.`);
  if (dc.maxTotalUses !== null && counts.totalUses + counts.totalPending >= dc.maxTotalUses) unavailable("This discount code has reached its maximum uses or has checkouts in progress.");
  return { effectiveLimit, usesRemaining: Math.max(0, effectiveLimit - counts.uses - counts.pending), discountAmount: calculateNightlyDiscount(input.nightlySubtotal, dc.discountType, Number(dc.discountValue)) };
}

async function database() { const db = await getDb(); if (!db) throw new Error("Database unavailable"); return db; }
async function findCode(db: Reader, input: Pick<DiscountSelection, "code" | "codeId">, lock = false) {
  if (!input.code && !input.codeId) unavailable("A discount code is required.");
  const condition = input.code ? eq(sql`UPPER(TRIM(${discountCodes.code}))`, normalizeDiscountCode(input.code)) : eq(discountCodes.id, input.codeId!);
  const query = db.select().from(discountCodes).where(condition).limit(1);
  const [dc] = await (lock ? query.for("update") : query);
  if (!dc || (input.codeId !== undefined && input.codeId !== dc.id)) unavailable("Invalid or inactive discount code.");
  return dc;
}

/** LOWER(TRIM(...)) deliberately includes legacy binary-collation usage without rewriting it. */
export async function getDiscountUsage(db: Reader, dc: DiscountCode, email: string) {
  const normalized = normalizeDiscountEmail(email);
  const [{ uses }] = await db.select({ uses: count() }).from(discountCodeUses).where(and(eq(discountCodeUses.discountCodeId, dc.id), eq(sql`LOWER(TRIM(${discountCodeUses.guestEmail}))`, normalized)));
  const [{ totalUses }] = await db.select({ totalUses: count() }).from(discountCodeUses).where(eq(discountCodeUses.discountCodeId, dc.id));
  const [{ pending }] = await db.select({ pending: count() }).from(discountCodeClaims).where(and(eq(discountCodeClaims.discountCodeId, dc.id), eq(discountCodeClaims.guestEmail, normalized), eq(discountCodeClaims.status, "pending")));
  const [{ totalPending }] = await db.select({ totalPending: count() }).from(discountCodeClaims).where(and(eq(discountCodeClaims.discountCodeId, dc.id), eq(discountCodeClaims.status, "pending")));
  const [override] = await db.select().from(discountCodeGuestOverrides).where(and(eq(discountCodeGuestOverrides.discountCodeId, dc.id), eq(discountCodeGuestOverrides.guestEmail, normalized))).limit(1);
  const overrideLimit = override?.maxUses ?? null;
  const effectiveLimit = overrideLimit ?? dc.maxUsesPerGuest;
  return { uses, totalUses, pending, totalPending, overrideLimit, defaultLimit: dc.maxUsesPerGuest, effectiveLimit, remaining: Math.max(0, effectiveLimit - uses - pending) };
}

export async function quoteDiscount(input: DiscountSelection) {
  const db = await database();
  const dc = await findCode(db, input);
  const usage = await getDiscountUsage(db, dc, input.guestEmail);
  return { id: dc.id, code: dc.code, label: dc.label, discountType: dc.discountType, discountValue: Number(dc.discountValue), ...assertDiscountEligibility(dc, input, usage) };
}

/** Lock one campaign row for every reservation, release, override and settlement.
 * READ COMMITTED prevents an earlier lookup from fixing an obsolete MySQL snapshot.
 * Pending claims reserve capacity but are NOT rows in the successful-use ledger.
 */
export async function reserveDiscount(input: DiscountSelection & { checkoutKey: string; expectedAmount?: number }) {
  const db = await database();
  return db.transaction(async tx => {
    const dc = await findCode(tx, input, true);
    const [existing] = await tx.select().from(discountCodeClaims).where(eq(discountCodeClaims.checkoutKey, input.checkoutKey)).limit(1).for("update");
    if (existing) {
      if (existing.discountCodeId !== dc.id || existing.guestEmail !== normalizeDiscountEmail(input.guestEmail)) unavailable("This checkout belongs to a different discount or guest.");
      if (existing.status === "released") {
        // Retain the old claim and give a verified-unpaid retry a fresh Stripe
        // idempotency key; reusing an expired session key would resurrect it.
        await tx.update(discountCodeClaims).set({ checkoutKey: `released:${existing.id}` }).where(eq(discountCodeClaims.id, existing.id));
      } else {
      if (existing.status !== "pending") unavailable("This discount checkout is already completed. Contact the host.");
      if (input.expectedAmount !== undefined && Math.round(input.expectedAmount * 100) !== Math.round(Number(existing.discountAmount) * 100)) unavailable("Saved discount pricing needs owner review.");
      return { claim: existing, id: dc.id, label: dc.label, code: dc.code, discountAmount: Number(existing.discountAmount) };
      }
    }
    const usage = await getDiscountUsage(tx, dc, input.guestEmail);
    const calculated = assertDiscountEligibility(dc, input, usage);
    if (input.expectedAmount !== undefined && Math.round(input.expectedAmount * 100) !== Math.round(calculated.discountAmount * 100)) unavailable("The saved coupon discount no longer matches this code. Ask the host to update the payment link.");
    const claim = { id: randomUUID(), checkoutKey: input.checkoutKey, discountCodeId: dc.id, guestEmail: normalizeDiscountEmail(input.guestEmail), discountAmount: calculated.discountAmount.toFixed(2), status: "pending" as const, bookingId: null, stripeCheckoutSessionId: null, createdAt: new Date(), settledAt: null };
    await tx.insert(discountCodeClaims).values(claim);
    return { claim, id: dc.id, label: dc.label, code: dc.code, discountAmount: calculated.discountAmount };
  }, { isolationLevel: "read committed" });
}

export async function attachDiscountBooking(claimId: string, bookingId: number) {
  return lockedClaim(claimId, async (tx, claim) => {
    if (claim.bookingId && claim.bookingId !== bookingId) throw new Error("Discount claim already belongs to a different booking");
    await tx.update(discountCodeClaims).set({ bookingId }).where(eq(discountCodeClaims.id, claimId));
  });
}

async function lockedClaim<T>(claimId: string, callback: (tx: Tx, claim: typeof discountCodeClaims.$inferSelect) => Promise<T>) {
  const db = await database();
  const [found] = await db.select().from(discountCodeClaims).where(eq(discountCodeClaims.id, claimId)).limit(1);
  if (!found) throw new Error("Discount claim not found");
  return db.transaction(async tx => {
    await tx.select().from(discountCodes).where(eq(discountCodes.id, found.discountCodeId)).limit(1).for("update");
    const [claim] = await tx.select().from(discountCodeClaims).where(eq(discountCodeClaims.id, claimId)).limit(1).for("update");
    if (!claim) throw new Error("Discount claim not found");
    return callback(tx, claim);
  }, { isolationLevel: "read committed" });
}

/** Only release before issuance or after Stripe definitively reports terminal unpaid expiration. */
export async function releaseDiscountClaim(claimId: string) {
  return lockedClaim(claimId, async (tx, claim) => {
    if (claim.status === "pending") await tx.update(discountCodeClaims).set({ status: "released", settledAt: new Date() }).where(eq(discountCodeClaims.id, claim.id));
  });
}

/** Durable claim is committed BEFORE provider issuance. A network/DB failure cannot free a potentially payable session. */
export async function issueDiscountCheckout(stripe: Stripe, claimId: string, params: Stripe.Checkout.SessionCreateParams) {
  const db = await database();
  const [claim] = await db.select().from(discountCodeClaims).where(eq(discountCodeClaims.id, claimId)).limit(1);
  if (!claim || claim.status !== "pending") unavailable("This coupon checkout is no longer available.");
  if (claim.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(claim.stripeCheckoutSessionId);
    if (existing.status !== "open" || existing.payment_status === "paid" || !existing.url) unavailable("This checkout is completed or expired. Please contact the host.");
    return existing;
  }
  try {
    const session = await stripe.checkout.sessions.create({ ...params, metadata: { ...params.metadata, discount_claim_id: claim.id } }, { idempotencyKey: `discount-claim-${claim.id}` });
    await db.update(discountCodeClaims).set({ stripeCheckoutSessionId: session.id }).where(eq(discountCodeClaims.id, claim.id));
    return session;
  } catch (error: any) {
    // These response types definitively reject creation; connection/timeouts/5xx do not.
    if (["StripeInvalidRequestError", "StripeAuthenticationError", "StripePermissionError"].includes(error?.type)) await releaseDiscountClaim(claimId);
    throw error;
  }
}

/** Paid receipt counts once even if fulfillment/Hostaway fails, or webhook/return page races.
 * Settlement honors an already-issued reservation even if the owner later lowers limits.
 */
export async function settleDiscountClaim(params: { claimId: string; sessionId: string; bookingId?: number; guestEmail?: string }) {
  return lockedClaim(params.claimId, async (tx, claim) => {
    if (claim.stripeCheckoutSessionId && claim.stripeCheckoutSessionId !== params.sessionId) throw new Error("Payment session does not match discount claim");
    if (params.guestEmail && normalizeDiscountEmail(params.guestEmail) !== claim.guestEmail) throw new Error("Paid guest does not match discount claim");
    if (claim.status === "released") throw new Error("Released discount claim received payment; owner reconciliation required");
    if (claim.bookingId && params.bookingId && claim.bookingId !== params.bookingId) throw new Error("Booking does not match discount claim");
    const bookingId = claim.bookingId ?? params.bookingId ?? null;
    if (claim.status === "succeeded") return { alreadyCounted: true };
    // A manual link can settle before its canonical booking is created. Binding is optional;
    // the claim lock is the primary replay guard, unique code/booking is a second guard.
    if (bookingId) {
      const [recorded] = await tx.select().from(discountCodeUses).where(and(eq(discountCodeUses.discountCodeId, claim.discountCodeId), eq(discountCodeUses.bookingId, bookingId))).limit(1);
      if (!recorded) await tx.insert(discountCodeUses).values({ discountCodeId: claim.discountCodeId, bookingId, guestEmail: claim.guestEmail, discountAmount: claim.discountAmount });
    } else {
      await tx.insert(discountCodeUses).values({ discountCodeId: claim.discountCodeId, bookingId: null, guestEmail: claim.guestEmail, discountAmount: claim.discountAmount });
    }
    await tx.update(discountCodeClaims).set({ status: "succeeded", bookingId, stripeCheckoutSessionId: params.sessionId, settledAt: new Date() }).where(eq(discountCodeClaims.id, claim.id));
    return { alreadyCounted: false };
  });
}

/** Lazy provider reconciliation: never free capacity on time alone (late paid webhooks are possible).
 * Open/ambiguous/unknown sessions retain only temporary capacity, never successful-use history.
 */
export async function reconcileDiscountClaims(stripe: Stripe, selection: Pick<DiscountSelection, "code" | "codeId">) {
  const db = await database();
  const dc = await findCode(db, selection);
  const pending = await db.select().from(discountCodeClaims).where(and(eq(discountCodeClaims.discountCodeId, dc.id), eq(discountCodeClaims.status, "pending")));
  for (const claim of pending) {
    if (!claim.stripeCheckoutSessionId) continue; // Unknown provider outcome: retain safely for owner reconciliation.
    try {
      const session = await stripe.checkout.sessions.retrieve(claim.stripeCheckoutSessionId);
      if (session.metadata?.discount_claim_id !== claim.id) continue;
      if (session.payment_status === "paid") await settleDiscountClaim({ claimId: claim.id, sessionId: session.id });
      else if (session.status === "expired") await releaseDiscountClaim(claim.id);
    } catch (error) { console.warn("[Discount] Claim reconciliation deferred:", claim.id, String(error)); }
  }
}

/** Legacy successful bookings without a claim still use the campaign lock and booking uniqueness. */
export async function recordLegacyDiscountSuccess(input: { codeId: number; bookingId: number; guestEmail: string; discountAmount: string }) {
  const db = await database();
  return db.transaction(async tx => {
    const [dc] = await tx.select().from(discountCodes).where(eq(discountCodes.id, input.codeId)).limit(1).for("update");
    if (!dc) throw new Error("Legacy discount code not found");
    const [existing] = await tx.select().from(discountCodeUses).where(and(eq(discountCodeUses.discountCodeId, input.codeId), eq(discountCodeUses.bookingId, input.bookingId))).limit(1);
    if (!existing) await tx.insert(discountCodeUses).values({ discountCodeId: input.codeId, bookingId: input.bookingId, guestEmail: normalizeDiscountEmail(input.guestEmail), discountAmount: input.discountAmount });
  }, { isolationLevel: "read committed" });
}

/** Owner coupon capacity belongs to the canonical stay, not each balance payment.
 * Successful use is recorded once only when the confirmed stay is fully paid.
 * Reads authoritative paidAmount; external credits/custom discounts are NOT receipts.
 * Lock order stays campaign -> claim; no booking lock is acquired, avoiding an
 * inversion with canonical receipt settlement's booking lock. Never fabricates a
 * Stripe session ID for an externally paid owner stay.
 */
export async function settleOwnerDiscountClaim(bookingId: number) {
  const db = await database();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.bookingSource !== "owner" || !booking.discountCodeId) return { alreadyCounted: false, deferred: true };
  const [claim] = await db.select().from(discountCodeClaims).where(and(eq(discountCodeClaims.bookingId, bookingId), eq(discountCodeClaims.checkoutKey, `owner:${booking.ownerRequestKey}`))).limit(1);
  if (!claim) throw new Error("Owner coupon is missing its durable capacity claim; owner reconciliation required");
  return lockedClaim(claim.id, async (tx, currentClaim) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!current || current.bookingSource !== "owner" || current.status !== "confirmed" || Number(current.paidAmount ?? 0) < Number(current.totalAmount)) return { alreadyCounted: false, deferred: true };
    if (currentClaim.discountCodeId !== current.discountCodeId || currentClaim.guestEmail !== normalizeDiscountEmail(current.guestEmail) || Math.round(Number(currentClaim.discountAmount) * 100) !== Math.round(Number(current.discountCodeAmount) * 100)) throw new Error("Owner coupon claim does not match canonical reservation");
    if (currentClaim.status === "succeeded") return { alreadyCounted: true, deferred: false };
    if (currentClaim.status !== "pending") throw new Error("Released owner coupon cannot settle automatically");
    const [recorded] = await tx.select().from(discountCodeUses).where(and(eq(discountCodeUses.discountCodeId, currentClaim.discountCodeId), eq(discountCodeUses.bookingId, bookingId))).limit(1);
    if (!recorded) await tx.insert(discountCodeUses).values({ discountCodeId: currentClaim.discountCodeId, bookingId, guestEmail: currentClaim.guestEmail, discountAmount: currentClaim.discountAmount });
    await tx.update(discountCodeClaims).set({ status: "succeeded", settledAt: new Date() }).where(eq(discountCodeClaims.id, currentClaim.id));
    return { alreadyCounted: false, deferred: false };
  });
}
