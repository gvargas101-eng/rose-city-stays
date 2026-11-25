import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reserve: vi.fn(), reconcile: vi.fn(), issue: vi.fn(), attach: vi.fn(), release: vi.fn(), settle: vi.fn(), legacy: vi.fn(), create: vi.fn(), insert: vi.fn(), stored: null as any, update: vi.fn(), manual: null as any, policies: [] as any[] }));
vi.mock("stripe", () => ({ default: class { checkout = { sessions: { create: mocks.create } }; coupons = { create: vi.fn().mockResolvedValue({ id: "owner-credit" }) }; } }));
vi.mock("./discount-claims", () => ({ normalizeDiscountEmail: (e: string) => e.trim().toLowerCase(), reserveDiscount: mocks.reserve, reconcileDiscountClaims: mocks.reconcile, issueDiscountCheckout: mocks.issue, attachDiscountBooking: mocks.attach, releaseDiscountClaim: mocks.release, settleDiscountClaim: mocks.settle, recordLegacyDiscountSuccess: mocks.legacy }));
vi.mock("./hostaway", () => ({ PROPERTY_TO_HOSTAWAY_ID: { "the-briar": 1 }, getPropertyCalendar: vi.fn().mockResolvedValue([]) }));
vi.mock("./hostaway-booking", () => ({ createHostawayReservation: vi.fn(), recordHostawayStripePayment: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./db", () => ({ getDb: async () => ({
  select: () => ({ from: (table: any) => {
    if (table?.policyText) return { where: () => ({ limit: async () => mocks.policies }) };
    const row = table?.token ? mocks.manual : table?.cleaningFee ? { active: 1, cleaningFee: "100" } : table?.key ? { value: "0.09" } : null;
    return { where: () => ({ limit: async () => row ? [row] : [], orderBy: async () => [] }), orderBy: async () => [] };
  } }),
  insert: (table: any) => ({ values: (value: any) => {
    if (table?.policyText) return { onDuplicateKeyUpdate: async () => { mocks.policies.push({ id: 1, ...value }); } };
    mocks.insert(value); mocks.stored = value; return { $returningId: async () => [{ id: 42 }] };
  } }),
  update: () => ({ set: (value: any) => { mocks.update(value); return { where: async () => [] }; } }),
}) }));
import { bookingRouter } from "./routers/booking";
const caller = () => bookingRouter.createCaller({ req: { headers: { origin: "https://www.rosecitystays.com" } } } as any);
const standard = { propertyId: "the-briar", propertyName: "The Briar", checkIn: "2027-01-01", checkOut: "2027-01-03", nights: 2, nightlyRate: 100, guestCount: 2, guestName: "Guest", guestEmail: " GUEST@example.com ", guestPhone: "555-0100" };
const manualInput = { token: "manual-token", guestName: "Guest", guestEmail: " GUEST@example.com ", origin: "https://www.rosecitystays.com" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.policies = [];
  mocks.reserve.mockResolvedValue({ claim: { id: "claim-1" }, id: 1, label: "Actual owner label", code: "LOYAL", discountAmount: 20 });
  mocks.issue.mockResolvedValue({ id: "cs_discount", url: "https://checkout.stripe.com/test" });
  mocks.create.mockResolvedValue({ id: "cs_owner", url: "https://checkout.stripe.com/owner" });
  mocks.manual = { id: 3, token: "manual-token", propertySlug: "the-briar", propertyName: "The Briar", hostawayListingId: 1, checkIn: Date.UTC(2027, 0, 1), checkOut: Date.UTC(2027, 0, 3), nights: 2, nightlyRate: "100", guestCount: 2, cleaningFee: "100", taxAmount: "18", extraGuestFee: "0", discountAmount: "20", discountCodeId: 1, guestEmail: " Guest@example.com ", totalAmount: "298", status: "active", expiresAt: Date.now() + 86400000, bypassAvailabilityCheck: 0 };
});
describe("authoritative standard coupon checkout", () => {
  it("rejects an arbitrary client discount amount without a coupon selector", async () => {
    await expect(caller().createCheckoutSession({ ...standard, discountCodeAmount: 9999 })).rejects.toThrow("owner-only");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects coupon IDs/labels without the actual entered code", async () => {
    await expect(caller().createCheckoutSession({ ...standard, discountCodeId: 1 })).rejects.toThrow("actual discount code");
    await expect(caller().createCheckoutSession({ ...standard, discountCodeLabel: "FREE" })).rejects.toThrow("actual discount code");
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("uses ID only as selector, ignores spoofed applied amount/label, normalizes email and discounts lodging only", async () => {
    await caller().createCheckoutSession({ ...standard, discountCode: "LOYAL", discountCodeId: 1, discountCodeAmount: 9999, discountCodeLabel: "FREE STAY" });
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ code: "LOYAL", codeId: 1, guestEmail: "guest@example.com", nightlySubtotal: 200 }));
    expect(mocks.stored).toMatchObject({ discountCodeId: 1, discountCodeLabel: "Actual owner label", discountCodeAmount: "20", totalAmount: "298", taxAmount: "18", cleaningFee: "100" });
    const params = mocks.issue.mock.calls[0][2];
    expect(params.line_items[0]).toMatchObject({ quantity: 1, price_data: { unit_amount: 18000 } });
    expect(params.line_items[1].price_data.unit_amount).toBe(10000);
    expect(params.line_items[2].price_data.unit_amount).toBe(1800);
    expect(params.allow_promotion_codes).toBeUndefined(); expect(params.discounts).toBeUndefined();
  });
  it("rejects exhausted coupon before booking insert or Stripe", async () => {
    mocks.reserve.mockRejectedValueOnce(new Error("lifetime limit (3)"));
    await expect(caller().createCheckoutSession({ ...standard, discountCode: "LOYAL", discountCodeId: 1 })).rejects.toThrow("lifetime limit");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.issue).not.toHaveBeenCalled();
  });
  it("non-coupon checkout never exposes unrestricted provider promotion codes", async () => {
    await caller().createCheckoutSession(standard);
    const params = mocks.create.mock.calls[0][0];
    expect(params.allow_promotion_codes).toBeUndefined(); expect(params.discounts).toBeUndefined();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
});
describe("manual link coupon versus explicit owner concession", () => {
  it("coupon link revalidates exact saved amount and binds guest email", async () => {
    await caller().createManualBookingCheckout(manualInput);
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ checkoutKey: "manual:manual-token", expectedAmount: 20, guestEmail: "guest@example.com", nightlySubtotal: 200, propertyId: "the-briar", codeId: 1 }));
    expect(mocks.issue.mock.calls[0][2].line_items[0].price_data.unit_amount).toBe(18000);
    expect(mocks.issue.mock.calls[0][2].discounts).toBeUndefined();
  });
  it("cannot substitute a different guest email to escape that guest's cap", async () => {
    await expect(caller().createManualBookingCheckout({ ...manualInput, guestEmail: "other@example.com" })).rejects.toThrow("restricted to the guest email");
    expect(mocks.issue).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("explicit owner discount without coupon ID is not a guest coupon and does not consume use allowance", async () => {
    mocks.manual.discountCodeId = null;
    await caller().createManualBookingCheckout(manualInput);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.issue).not.toHaveBeenCalled();
    expect(mocks.create.mock.calls[0][0].discounts).toEqual([{ coupon: "owner-credit" }]);
  });
});
