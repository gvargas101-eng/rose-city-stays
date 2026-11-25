import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { discountCodes, discountCodeClaims, discountCodeGuestOverrides, discountCodeUses, type DiscountCode } from "../drizzle/schema";
const mocks = vi.hoisted(() => ({ db: null as any }));
vi.mock("./db", () => ({ getDb: async () => mocks.db }));
import { assertDiscountEligibility, calculateNightlyDiscount, reserveDiscount, quoteDiscount, settleDiscountClaim, settleOwnerDiscountClaim, releaseDiscountClaim, issueDiscountCheckout, reconcileDiscountClaims, attachDiscountBooking, recordLegacyDiscountSuccess } from "./discount-claims";

const dc = (): DiscountCode => ({ id: 1, code: "LOYAL", label: "Loyal guest", discountType: "percent", discountValue: "10", maxUsesPerGuest: 3, maxTotalUses: null, expiresAt: null, propertyRestrictions: null, isActive: 1, adminNotes: null, createdAt: new Date(), updatedAt: new Date() });
const input = (email = "guest@example.com") => ({ codeId: 1, guestEmail: email, propertyId: "the-briar", nightlySubtotal: 500 });
const counts = { uses: 0, pending: 0, totalUses: 0, totalPending: 0, overrideLimit: null };

/** In-memory adapter models SQL filters and a transactional campaign-row mutex.
 * Tests exercise production helper functions, never a live DB/provider.
 */
function fakeDb() {
  const data: Record<string, any[]> = { bookings: [], discount_codes: [dc()], discount_code_uses: [], discount_code_claims: [], discount_code_guest_overrides: [] };
  const writes: any[] = [];
  const dialect = new MySqlDialect();
  function filtered(table: any, condition: any) {
    const rows = data[getTableName(table)] ?? [];
    if (!condition) return [...rows];
    const query = dialect.sqlToQuery(condition);
    const comparisons = [...query.sql.matchAll(/(?:UPPER\(TRIM\(|LOWER\(TRIM\()?`[^`]+`\.`([^`]+)`(?:\)\))? = \?/g)];
    return rows.filter(row => comparisons.every((m, i) => {
      const value = row[m[1]];
      if (m[0].startsWith("LOWER")) return String(value).trim().toLowerCase() === query.params[i];
      if (m[0].startsWith("UPPER")) return String(value).trim().toUpperCase() === query.params[i];
      return value === query.params[i];
    }));
  }
  const api = {
    select(fields?: any) {
      return { from(table: any) {
        let condition: any; let limit: number | undefined;
        const result = () => {
          const rows = filtered(table, condition);
          if (fields && Object.values(fields).some(v => !(v as any)?.name)) return [Object.fromEntries(Object.keys(fields).map(k => [k, rows.length]))];
          return rows.slice(0, limit);
        };
        const chain: any = { where(c: any) { condition = c; return chain; }, limit(n: number) { limit = n; return chain; }, for() { return Promise.resolve(result()); }, then(resolve: any, reject: any) { return Promise.resolve(result()).then(resolve, reject); } };
        return chain;
      } };
    },
    insert(table: any) { return { values(values: any) { const name = getTableName(table); writes.push({ name, values }); data[name].push({ ...values }); return Promise.resolve([]); } }; },
    update(table: any) { return { set(values: any) { return { where(condition: any) { const rows = filtered(table, condition); for (const row of rows) Object.assign(row, values); return Promise.resolve([]); } }; } }; },
    transaction: null as any,
  };
  let queue = Promise.resolve();
  api.transaction = (callback: any, config: any) => {
    expect(config?.isolationLevel).toBe("read committed");
    const current = queue.then(() => callback(api)); queue = current.then(() => undefined, () => undefined); return current;
  };
  return { api, data, writes };
}
let state: ReturnType<typeof fakeDb>;
beforeEach(() => { state = fakeDb(); mocks.db = state.api; });

describe("discount eligibility and lifetime cap", () => {
  it("defaults to three successful lifetime uses, normalizing legacy whitespace and case", async () => {
    state.data.discount_code_uses.push(...[1, 2, 3].map(id => ({ id, discountCodeId: 1, bookingId: id, guestEmail: "  GUEST@Example.COM ", discountAmount: "50" })));
    await expect(quoteDiscount(input(" Guest@example.com "))).rejects.toThrow("lifetime limit (3)");
    expect(state.data.discount_code_uses).toHaveLength(3);
  });
  it("absolute override of five permits two remaining after three uses, not five additional", async () => {
    state.data.discount_code_uses.push(...[1, 2, 3].map(id => ({ id, discountCodeId: 1, bookingId: id, guestEmail: "guest@example.com" })));
    state.data.discount_code_guest_overrides.push({ discountCodeId: 1, guestEmail: "guest@example.com", maxUses: 5 });
    expect(await quoteDiscount(input())).toMatchObject({ usesRemaining: 2, effectiveLimit: 5, discountAmount: 50 });
    await reserveDiscount({ ...input(), checkoutKey: "one" });
    await reserveDiscount({ ...input(), checkoutKey: "two" });
    await expect(reserveDiscount({ ...input(), checkoutKey: "three" })).rejects.toThrow("lifetime limit (5)");
    expect(state.data.discount_code_uses).toHaveLength(3);
  });
  it("zero override blocks even a guest with no historical uses", async () => {
    state.data.discount_code_guest_overrides.push({ discountCodeId: 1, guestEmail: "guest@example.com", maxUses: 0 });
    await expect(reserveDiscount({ ...input(), checkoutKey: "zero" })).rejects.toThrow("lifetime limit (0)");
  });
  it("per-guest override cannot bypass total campaign cap", () => {
    expect(() => assertDiscountEligibility({ ...dc(), maxTotalUses: 3 }, input(), { ...counts, overrideLimit: 100, totalUses: 3 })).toThrow("maximum uses");
  });
  it("expiry at boundary and inactive codes fail closed", () => {
    expect(() => assertDiscountEligibility({ ...dc(), expiresAt: 10 }, input(), counts, 10)).toThrow("expired");
    expect(() => assertDiscountEligibility({ ...dc(), isActive: 0 }, input(), counts)).toThrow("inactive");
  });
  it("property restriction cannot be skipped by omitting property, malformed config fails closed", () => {
    const restricted = { ...dc(), propertyRestrictions: '["the-briar"]' };
    expect(() => assertDiscountEligibility(restricted, { ...input(), propertyId: undefined }, counts)).toThrow("not valid for this property");
    expect(() => assertDiscountEligibility(restricted, { ...input(), propertyId: "other" }, counts)).toThrow("not valid for this property");
    expect(() => assertDiscountEligibility({ ...dc(), propertyRestrictions: "bad json" }, input(), counts)).toThrow("owner review");
  });
  it("nightly-only percent/fixed discount clamps and rounds without touching fees/tax", () => {
    expect(calculateNightlyDiscount(100.05, "percent", 10)).toBe(10.01);
    expect(calculateNightlyDiscount(100, "fixed", 500)).toBe(100);
    expect(calculateNightlyDiscount(100, "percent", 150)).toBe(100);
    expect(() => calculateNightlyDiscount(100, "fixed", Infinity)).toThrow("Invalid discount");
  });
  it("code and ID disagreement fails, saved manual amounts are revalidated", async () => {
    await expect(reserveDiscount({ ...input(), code: "LOYAL", codeId: 2, checkoutKey: "bad" })).rejects.toThrow("Invalid");
    await expect(reserveDiscount({ ...input(), checkoutKey: "saved", expectedAmount: 499 })).rejects.toThrow("no longer matches");
    expect(state.data.discount_code_claims).toHaveLength(0);
  });
});

describe("atomic pending and successful lifecycle", () => {
  it("concurrent checkouts cannot take the last guest use twice", async () => {
    state.data.discount_codes[0].maxUsesPerGuest = 1;
    const results = await Promise.allSettled([reserveDiscount({ ...input(), checkoutKey: "a" }), reserveDiscount({ ...input(" GUEST@example.com "), checkoutKey: "b" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(state.data.discount_code_claims).toHaveLength(1);
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
  it("concurrent different guests cannot bypass a total cap of one", async () => {
    state.data.discount_codes[0].maxTotalUses = 1;
    const results = await Promise.allSettled([reserveDiscount({ ...input(), checkoutKey: "a" }), reserveDiscount({ ...input("other@example.com"), checkoutKey: "b" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  });
  it("failed pre-issuance claim releases capacity without consuming success; history retained", async () => {
    state.data.discount_codes[0].maxUsesPerGuest = 1;
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "fail" });
    await releaseDiscountClaim(reserved.claim.id);
    await expect(reserveDiscount({ ...input(), checkoutKey: "retry" })).resolves.toBeDefined();
    expect(state.data.discount_code_uses).toHaveLength(0);
    expect(state.data.discount_code_claims).toHaveLength(2);
  });
  it("paid webhook/return replay races insert exactly one successful use", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "paid" });
    await attachDiscountBooking(reserved.claim.id, 42);
    const params = { claimId: reserved.claim.id, sessionId: "cs_paid", bookingId: 42, guestEmail: " GUEST@example.com " };
    const results = await Promise.all([settleDiscountClaim(params), settleDiscountClaim(params)]);
    expect(results.filter(r => r.alreadyCounted)).toHaveLength(1);
    expect(state.data.discount_code_uses).toHaveLength(1);
    expect(state.data.discount_code_uses[0]).toMatchObject({ bookingId: 42, guestEmail: "guest@example.com", discountAmount: "50.00" });
    expect(await quoteDiscount(input())).toMatchObject({ usesRemaining: 2 });
  });
  it("manual claim settled before booking binding does not count again", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "manual:token" });
    await settleDiscountClaim({ claimId: reserved.claim.id, sessionId: "cs_manual" });
    await attachDiscountBooking(reserved.claim.id, 77);
    await settleDiscountClaim({ claimId: reserved.claim.id, sessionId: "cs_manual", bookingId: 77 });
    expect(state.data.discount_code_uses).toHaveLength(1);
  });
  it("session/guest substitution fails and owner cap reductions do not erase already-paid use", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "issued" });
    state.data.discount_code_claims[0].stripeCheckoutSessionId = "cs_issued";
    await expect(settleDiscountClaim({ claimId: reserved.claim.id, sessionId: "cs_arbitrary" })).rejects.toThrow("does not match");
    await expect(settleDiscountClaim({ claimId: reserved.claim.id, sessionId: "cs_issued", guestEmail: "other@example.com" })).rejects.toThrow("guest does not match");
    state.data.discount_codes[0].maxUsesPerGuest = 0;
    await settleDiscountClaim({ claimId: reserved.claim.id, sessionId: "cs_issued" });
    expect(state.data.discount_code_uses).toHaveLength(1);
  });
  it("legacy successful booking replay is also idempotent", async () => {
    const legacy = { codeId: 1, bookingId: 55, guestEmail: " GUEST@EXAMPLE.com ", discountAmount: "25" };
    await Promise.all([recordLegacyDiscountSuccess(legacy), recordLegacyDiscountSuccess(legacy)]);
    expect(state.data.discount_code_uses).toHaveLength(1);
  });
  it("idempotent manual reservation retry returns same claim rather than consuming capacity twice", async () => {
    state.data.discount_codes[0].maxUsesPerGuest = 1;
    const first = await reserveDiscount({ ...input(), checkoutKey: "manual:token" });
    const second = await reserveDiscount({ ...input(" GUEST@example.com "), checkoutKey: "manual:token" });
    expect(second.claim.id).toBe(first.claim.id);
    expect(state.data.discount_code_claims).toHaveLength(1);
    await expect(reserveDiscount({ ...input("other@example.com"), checkoutKey: "manual:token" })).rejects.toThrow("different discount or guest");
  });
});

describe("provider outcome safety", () => {
  it("verified expired retry preserves old claim and issues a new claim/idempotency key", async () => {
    const first = await reserveDiscount({ ...input(), checkoutKey: "manual:retry" });
    await releaseDiscountClaim(first.claim.id);
    const retry = await reserveDiscount({ ...input(), checkoutKey: "manual:retry" });
    expect(retry.claim.id).not.toBe(first.claim.id);
    expect(state.data.discount_code_claims).toHaveLength(2);
    expect(state.data.discount_code_claims[0].checkoutKey).toBe(`released:${first.claim.id}`);
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
  it("does not free potentially payable capacity on connection failure", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "uncertain" });
    const stripe = { checkout: { sessions: { create: vi.fn().mockRejectedValue({ type: "StripeConnectionError" }) } } } as any;
    await expect(issueDiscountCheckout(stripe, reserved.claim.id, { mode: "payment" })).rejects.toBeDefined();
    expect(state.data.discount_code_claims[0].status).toBe("pending");
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
  it("definitive provider rejection frees only temporary capacity", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "invalid" });
    const stripe = { checkout: { sessions: { create: vi.fn().mockRejectedValue({ type: "StripeInvalidRequestError" }) } } } as any;
    await expect(issueDiscountCheckout(stripe, reserved.claim.id, { mode: "payment" })).rejects.toBeDefined();
    expect(state.data.discount_code_claims[0].status).toBe("released");
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
  it("provider expired-unpaid verification frees capacity, local time/open/unknown do not", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "expire" });
    state.data.discount_code_claims[0].stripeCheckoutSessionId = "cs_expire";
    const retrieve = vi.fn().mockResolvedValue({ id: "cs_expire", status: "open", payment_status: "unpaid", metadata: { discount_claim_id: reserved.claim.id } });
    await reconcileDiscountClaims({ checkout: { sessions: { retrieve } } } as any, { codeId: 1 });
    expect(state.data.discount_code_claims[0].status).toBe("pending");
    retrieve.mockResolvedValue({ id: "cs_expire", status: "expired", payment_status: "unpaid", metadata: { discount_claim_id: reserved.claim.id } });
    await reconcileDiscountClaims({ checkout: { sessions: { retrieve } } } as any, { codeId: 1 });
    expect(state.data.discount_code_claims[0].status).toBe("released");
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
  it("paid status wins over expiration and replay never double counts", async () => {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "late" });
    state.data.discount_code_claims[0].stripeCheckoutSessionId = "cs_late";
    const stripe = { checkout: { sessions: { retrieve: vi.fn().mockResolvedValue({ id: "cs_late", status: "expired", payment_status: "paid", metadata: { discount_claim_id: reserved.claim.id } }) } } } as any;
    await reconcileDiscountClaims(stripe, { codeId: 1 });
    await reconcileDiscountClaims(stripe, { codeId: 1 });
    expect(state.data.discount_code_claims[0].status).toBe("succeeded");
    expect(state.data.discount_code_uses).toHaveLength(1);
  });
});

describe("owner coupon settlement is distinct from money and custom concessions", () => {
  async function owner() {
    const reserved = await reserveDiscount({ ...input(), checkoutKey: "owner:request-1", expectedAmount: 50 });
    await attachDiscountBooking(reserved.claim.id, 88);
    const booking = { id: 88, bookingSource: "owner", status: "confirmed", totalAmount: "600", paidAmount: "0", discountCodeId: 1, discountCodeAmount: "50", ownerRequestKey: "request-1", guestEmail: " GUEST@example.com " };
    state.data.bookings.push(booking);
    return booking;
  }
  it("unpaid and partial payments hold capacity without consuming a successful use", async () => {
    const booking = await owner();
    expect(await settleOwnerDiscountClaim(88)).toMatchObject({ deferred: true });
    booking.paidAmount = "300";
    expect(await settleOwnerDiscountClaim(88)).toMatchObject({ deferred: true });
    expect(state.data.discount_code_uses).toHaveLength(0);
    expect(state.data.discount_code_claims[0].status).toBe("pending");
  });
  it("fully-paid confirmed owner coupon counts once on external receipt/replay and never stores a fake session", async () => {
    const booking = await owner(); booking.paidAmount = "600";
    const results = await Promise.all([settleOwnerDiscountClaim(88), settleOwnerDiscountClaim(88)]);
    expect(results.filter(r => r.alreadyCounted)).toHaveLength(1);
    expect(state.data.discount_code_uses).toHaveLength(1);
    expect(state.data.discount_code_claims[0].stripeCheckoutSessionId).toBeNull();
  });
  it("canceled or uncertain owner stays cannot acquire permanent successful uses", async () => {
    const booking = await owner(); booking.paidAmount = "600"; booking.status = "cancelled";
    expect(await settleOwnerDiscountClaim(88)).toMatchObject({ deferred: true });
    expect(state.data.discount_code_uses).toHaveLength(0);
    booking.status = "pending";
    expect(await settleOwnerDiscountClaim(88)).toMatchObject({ deferred: true });
  });
  it("owner customization without coupon ID does not create usage", async () => {
    state.data.bookings.push({ id: 88, bookingSource: "owner", status: "confirmed", totalAmount: "600", paidAmount: "600", discountCodeId: null, discountCodeAmount: "50" });
    expect(await settleOwnerDiscountClaim(88)).toMatchObject({ deferred: true });
    expect(state.data.discount_code_uses).toHaveLength(0);
  });
});
