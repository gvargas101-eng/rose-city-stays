import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  bookings,
  bookingCancellationPolicies,
  discountCodeClaims,
  manualBookingLinks,
  ownerBookingPayments,
  properties,
  siteSettings,
} from "../drizzle/schema";
const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  calendar: vi.fn(),
  create: vi.fn(),
  recover: vi.fn(),
  state: vi.fn(),
  sync: vi.fn(),
  stripeSession: vi.fn(),
  discountReserve: vi.fn(),
  discountReconcile: vi.fn(),
  discountRelease: vi.fn(),
  discountSettle: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("stripe", () => ({
  default: vi
    .fn()
    .mockImplementation(() => ({
      checkout: { sessions: { retrieve: mocks.stripeSession } },
    })),
}));
vi.mock("./hostaway", () => ({
  getPropertyCalendar: mocks.calendar,
  PROPERTY_TO_HOSTAWAY_ID: { private: 630308 },
}));
vi.mock("./hostaway-booking", () => ({
  createHostawayOwnerReservation: mocks.create,
  findHostawayOwnerReservation: mocks.recover,
  getHostawayOwnerPaymentState: mocks.state,
}));
vi.mock("./owner-booking-payments", () => ({
  syncOwnerReceiptToHostaway: mocks.sync,
}));
vi.mock("./discount-claims", () => ({
  reserveDiscount: mocks.discountReserve, reconcileDiscountClaims: mocks.discountReconcile,
  releaseDiscountClaim: mocks.discountRelease, settleOwnerDiscountClaim: mocks.discountSettle,
}));
import {
  createOwnerBooking,
  createOwnerPaymentLink,
  ownerBookingInput,
  ownerPaymentSummary,
  validateOwnerBooking,
} from "./owner-bookings";
const input = () =>
  ownerBookingInput.parse({
    requestKey: "d60e1c75-113e-4331-9f6e-ff6c9956ef58",
    propertySlug: "private",
    checkIn: Date.UTC(2027, 0, 10),
    checkOut: Date.UTC(2027, 0, 12),
    nights: 2,
    guestCount: 4,
    guestName: "Example Guest",
    guestEmail: "guest@example.com",
    nightlyRate: 200,
    cleaningFee: 100,
    taxAmount: 0,
    totalAmount: 500,
    allowUnpaid: true,
  });
function mockDb(existing?: any) {
  const rows: any[] = existing ? [existing] : [];
  const receipts: any[] = [];
  const links: any[] = [];
  const policies: any[] = [];
  const claimBindings: any[] = [];
  let propertyActive = 0;
  let reservationSelected = 0;
  const db: any = {
    select: (projection?: any) => ({
      from: (table: any) => {
        const get = () =>
          table === properties
            ? [
                {
                  slug: "private",
                  name: "Private property",
                  active: propertyActive,
                  guests: 8,
                  hostawayListingId: 630308,
                },
              ]
            : table === siteSettings
              ? [{ value: "500" }]
              : table === ownerBookingPayments
                ? receipts
                : table === manualBookingLinks
                  ? links
                  : projection
                    ? []
                    : rows;
        const q: any = {
          where: () => q,
          limit: async () => get(),
          for: async () => get(),
          then: (resolve: any) => Promise.resolve(get()).then(resolve),
        };
        return q;
      },
    }),
    insert: (table: any) => ({
      values: async (value: any) => {
        const id = table === bookings ? 7 : 9;
        if (table === bookings)
          rows.push({ id, ...value, hostawayReservationId: null });
        if (table === ownerBookingPayments)
          receipts.push({ id, ...value, hostawaySyncStatus: "pending" });
        if (table === manualBookingLinks) links.push({ id, ...value });
        if (table === bookingCancellationPolicies) policies.push({ id, ...value });
        return [{ insertId: id }];
      },
    }),
    update: (table: any) => ({
      set: (value: any) => ({
        where: async () => {
          if (table === bookings) Object.assign(rows[0], value);
          if (table === discountCodeClaims) claimBindings.push(value);
        },
      }),
    }),
    transaction: async (f: any) => f(db),
  };
  mocks.getDb.mockResolvedValue(db);
  return { db, rows, receipts, links, policies, claimBindings };
}
describe("owner payment state and validation", () => {
  it("separates unpaid, partially paid, paid, and complimentary stays", () => {
    expect(ownerPaymentSummary(500, 0)).toMatchObject({
      paymentStatus: "unpaid",
      balanceDue: 500,
    });
    expect(ownerPaymentSummary(500, 100)).toMatchObject({
      paymentStatus: "partially_paid",
      balanceDue: 400,
    });
    expect(ownerPaymentSummary(500, 500)).toMatchObject({
      paymentStatus: "paid",
      balanceDue: 0,
    });
    expect(ownerPaymentSummary(0, 0)).toMatchObject({
      paymentStatus: "complimentary",
      balanceDue: 0,
    });
  });
  it("requires explicit unpaid authorization and a real-receipt reference", () => {
    expect(() =>
      validateOwnerBooking({ ...input(), allowUnpaid: false })
    ).toThrow("Explicitly allow");
    expect(() =>
      validateOwnerBooking({ ...input(), amountReceived: 100 })
    ).toThrow("payment reference");
    expect(() =>
      validateOwnerBooking({
        ...input(),
        amountReceived: 501,
        paymentReference: "bank",
      })
    ).toThrow("no greater");
  });
  it("accepts a fully credited zero total without representing credits as received cash", () => {
    const result = validateOwnerBooking({
      ...input(),
      totalAmount: 0,
      allowUnpaid: false,
      customLineItems: [{ label: "Owner credit", amount: -500 }],
    });
    expect(result).toMatchObject({
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      paymentStatus: "complimentary",
    });
  });
  it("rejects excessive credits, forged totals, mismatched dates, and subcent receipts", () => {
    expect(() =>
      validateOwnerBooking({
        ...input(),
        totalAmount: 0,
        customLineItems: [{ label: "Credit", amount: -501 }],
      })
    ).toThrow("exceed");
    expect(() =>
      validateOwnerBooking({ ...input(), totalAmount: 499 })
    ).toThrow("itemized");
    expect(() => validateOwnerBooking({ ...input(), nights: 3 })).toThrow(
      "night count"
    );
    expect(() =>
      validateOwnerBooking({
        ...input(),
        amountReceived: 1.001,
        paymentReference: "bank",
      })
    ).toThrow("cent-accurate");
  });
});
describe("actual owner reservation persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendar.mockResolvedValue(
      ["2027-01-10", "2027-01-11"].map(date => ({
        date,
        isAvailable: true,
        status: "available",
      }))
    );
    mocks.recover.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "123", status: "new" });
    mocks.state.mockResolvedValue({
      remainingBalance: 400,
      hasScheduledCollection: false,
      cancelled: false,
    });
    mocks.sync.mockResolvedValue(undefined);
  });
  it("creates one real unpaid reservation for a hidden property without activating it", async () => {
    const { rows, receipts } = mockDb();
    const result = await createOwnerBooking(input(), "owner");
    expect(result).toMatchObject({
      bookingId: 7,
      hostawayReservationId: "123",
      status: "confirmed",
      paymentStatus: "unpaid",
      amountPaid: 0,
      balanceDue: 500,
    });
    expect(rows).toHaveLength(1);
    expect(receipts).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      bookingSource: "owner",
      paidAmount: "0.00",
      depositHoldStatus: "pending",
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("records a partial external receipt without charging and synchronizes just that receipt", async () => {
    const { rows, receipts } = mockDb();
    const result = await createOwnerBooking(
      {
        ...input(),
        amountReceived: 100,
        paymentReference: "Bank transfer 123",
      },
      "owner"
    );
    expect(result).toMatchObject({
      status: "confirmed",
      amountPaid: 100,
      balanceDue: 400,
      paymentStatus: "partially_paid",
    });
    expect(receipts[0]).toMatchObject({
      amount: "100.00",
      method: "external",
      reference: "Bank transfer 123",
    });
    expect(mocks.sync).toHaveBeenCalledWith(9);
    expect(rows[0].paidAmount).toBe("100.00");
  });
  it("preserves money actually received even if reservation creation becomes uncertain", async () => {
    const { rows, receipts } = mockDb();
    mocks.create.mockRejectedValue(new Error("timeout"));
    const result = await createOwnerBooking(
      { ...input(), amountReceived: 100, paymentReference: "bank" },
      "owner"
    );
    expect(result).toMatchObject({
      status: "pending",
      amountPaid: 100,
      balanceDue: 400,
    });
    expect(result.error).toContain("will not be sent again");
    expect(rows).toHaveLength(1);
    expect(receipts).toHaveLength(1);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("never confirms occupied or unverified dates, even if an availability bypass was sent", async () => {
    mockDb();
    mocks.calendar.mockResolvedValue([]);
    await expect(
      createOwnerBooking({ ...input(), bypassAvailabilityCheck: true }, "owner")
    ).rejects.toThrow("unavailable or unverified");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns the existing request without repeating Hostaway POST, and rejects changed payload reuse", async () => {
    const payload = input();
    const hash = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    mockDb({
      id: 7,
      ownerRequestHash: hash,
      status: "pending",
      totalAmount: "500",
      paidAmount: "0",
      hostawayReservationId: null,
    });
    expect(await createOwnerBooking(payload, "owner")).toMatchObject({
      alreadyCreated: true,
      status: "pending",
    });
    expect(mocks.create).not.toHaveBeenCalled();
    await expect(
      createOwnerBooking({ ...payload, guestName: "Changed" }, "owner")
    ).rejects.toThrow("different details");
  });
  it("recovers an accepted timed-out request by marker without repeating creation or reviving a canceled stay", async () => {
    const payload = input();
    const hash = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    mockDb({
      id: 7,
      ownerRequestHash: hash,
      status: "pending",
      totalAmount: "500",
      paidAmount: "0",
      hostawayReservationId: null,
      hostawayListingId: 630308,
      guestEmail: payload.guestEmail,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
    });
    mocks.recover.mockResolvedValue({ id: "123", status: "new" });
    expect(await createOwnerBooking(payload, "owner")).toMatchObject({
      alreadyCreated: true,
      status: "confirmed",
      hostawayReservationId: "123",
    });
    expect(mocks.create).not.toHaveBeenCalled();
    const { rows } = mockDb({
      id: 7,
      ownerRequestHash: hash,
      status: "pending",
      totalAmount: "500",
      paidAmount: "0",
      hostawayReservationId: null,
      hostawayListingId: 630308,
      guestEmail: payload.guestEmail,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
    });
    mocks.recover.mockResolvedValue({ id: "123", status: "cancelled" });
    await createOwnerBooking(payload, "owner");
    expect(rows[0].status).toBe("cancelled");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps successful reservation confirmation if optional payment-link creation is blocked by Hostaway", async () => {
    mockDb();
    mocks.state.mockResolvedValue({
      remainingBalance: 500,
      hasScheduledCollection: true,
      cancelled: false,
    });
    const result = await createOwnerBooking(
      { ...input(), createPaymentLink: true },
      "owner"
    );
    expect(result).toMatchObject({
      status: "confirmed",
      hostawayReservationId: "123",
    });
    expect(result.error).toContain(
      "Reservation created. Payment link not created"
    );
  });
  it("blocks collection links when receipts have not synchronized with Hostaway", async () => {
    const { receipts } = mockDb({
      id: 7,
      bookingSource: "owner",
      status: "confirmed",
      hostawayReservationId: "123",
      totalAmount: "500",
      paidAmount: "100",
    });
    receipts.push({ hostawaySyncStatus: "failed" });
    await expect(createOwnerPaymentLink(7)).rejects.toThrow(
      "Synchronize recorded receipts"
    );
  });
});

describe("cross-token owner balance collection safety", () => {
  const booking = () => ({
    ...input(),
    id: 7,
    propertyId: "private",
    bookingSource: "owner",
    status: "confirmed",
    hostawayReservationId: "123",
    totalAmount: "500",
    paidAmount: "100",
    depositHoldAmount: "0",
    message: "{}",
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.mockResolvedValue({
      remainingBalance: 400,
      hasScheduledCollection: false,
      cancelled: false,
    });
  });
  it("does not issue a replacement token while a revoked token's Stripe URL can still collect", async () => {
    const { links } = mockDb(booking());
    links.push({
      id: 1,
      token: "old-token",
      bookingId: 7,
      status: "revoked",
      totalAmount: "400",
      expiresAt: Date.now() + 86400000,
      stripeCheckoutSessionId: "cs_old",
    });
    mocks.stripeSession.mockResolvedValue({
      status: "open",
      payment_status: "unpaid",
      amount_total: 40000,
      metadata: { owner_booking_id: "7", manual_booking_token: "old-token" },
    });
    await expect(createOwnerPaymentLink(7)).rejects.toThrow(
      "earlier balance checkout"
    );
    expect(links).toHaveLength(1);
  });
  it("allows a new token after Stripe confirms the old checkout expired without payment", async () => {
    const { links } = mockDb(booking());
    links.push({
      id: 1,
      token: "old-token",
      bookingId: 7,
      status: "active",
      totalAmount: "400",
      expiresAt: Date.now() - 1000,
      stripeCheckoutSessionId: "cs_old",
    });
    mocks.stripeSession.mockResolvedValue({
      status: "expired",
      payment_status: "unpaid",
      amount_total: 40000,
      metadata: { owner_booking_id: "7", manual_booking_token: "old-token" },
    });
    const result = await createOwnerPaymentLink(7);
    expect(result.balanceDue).toBe(400);
    expect(result.token).not.toBe("old-token");
    expect(links).toHaveLength(2);
  });
});

describe("owner reservation balance-link repair", () => {
  const existingBooking = (warning: string | null = null) => ({
    ...input(),
    id: 7,
    propertyId: "private",
    bookingSource: "owner",
    status: "confirmed",
    hostawayReservationId: "123",
    totalAmount: "500.00",
    paidAmount: "0.00",
    depositHoldAmount: "500.00",
    ownerCreateError: warning,
    message: "{}",
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendar.mockResolvedValue(["2027-01-10", "2027-01-11"].map(date => ({ date, isAvailable: true, status: "available" })));
    mocks.create.mockResolvedValue({ id: "123", status: "new" });
    mocks.state.mockResolvedValue({ remainingBalance: 500, hasScheduledCollection: false, cancelled: false });
  });
  it("creates one actual unpaid stay and its matching balance link without initiating a card charge", async () => {
    const { rows, links, receipts } = mockDb();
    const result = await createOwnerBooking({ ...input(), createPaymentLink: true }, "owner");
    expect(result).toMatchObject({ status: "confirmed", hostawayReservationId: "123", balanceDue: 500, amountPaid: 0, paymentStatus: "unpaid" });
    expect(result.token).toEqual(expect.any(String));
    expect(result.error).toBeUndefined();
    expect(rows).toHaveLength(1);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ bookingId: 7, hostawayReservationId: "123", totalAmount: "500.00" });
    expect(receipts).toHaveLength(0);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.stripeSession).not.toHaveBeenCalled();
  });
  it("reports scheduled native collection rather than a missing balance while keeping the booking confirmed", async () => {
    const { rows, links } = mockDb();
    mocks.state.mockResolvedValue({ remainingBalance: 500, hasScheduledCollection: true, cancelled: false });
    const result = await createOwnerBooking({ ...input(), createPaymentLink: true }, "owner");
    expect(result.status).toBe("confirmed");
    expect(result.error).toContain("Hostaway already has a stay-payment collection scheduled");
    expect(result.error).toContain("prevent double charging");
    expect(result.error).toContain("do not recreate");
    expect(rows).toHaveLength(1);
    expect(links).toHaveLength(0);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("retries only the existing balance link and clears its obsolete optional-link error", async () => {
    const { rows, links } = mockDb(existingBooking("Reservation created. Payment link not created: Hostaway has not provided a verifiable balance."));
    const result = await createOwnerPaymentLink(7);
    expect(result.balanceDue).toBe(500);
    expect(rows[0]).toMatchObject({ status: "confirmed", hostawayReservationId: "123", paidAmount: "0.00", ownerCreateError: null });
    expect(rows).toHaveLength(1);
    expect(links).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.stripeSession).not.toHaveBeenCalled();
  });
  it("clears the obsolete warning when reusing an existing valid token without issuing another", async () => {
    const { rows, links } = mockDb(existingBooking("Reservation created. Payment link not created: Previous lookup failure"));
    links.push({ id: 9, bookingId: 7, token: "existing-token", status: "active", totalAmount: "500.00", expiresAt: Date.now() + 86400000 });
    expect((await createOwnerPaymentLink(7)).token).toBe("existing-token");
    expect(rows[0].ownerCreateError).toBeNull();
    expect(links).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not erase an unrelated receipt synchronization warning", async () => {
    const warning = "Reservation created and received funds recorded. Hostaway receipt synchronization needs review.";
    const { rows } = mockDb(existingBooking(warning));
    await createOwnerPaymentLink(7);
    expect(rows[0].ownerCreateError).toBe(warning);
  });
  it.each([
    [{ remainingBalance: 500, hasScheduledCollection: false, cancelled: true }, "canceled in Hostaway"],
    [{ remainingBalance: 400, hasScheduledCollection: false, cancelled: false }, "Hostaway balance ($400.00) differs from the website balance ($500.00)"],
    [{ remainingBalance: 500, hasScheduledCollection: true, cancelled: false }, "stay-payment collection scheduled"],
  ])("retains the original warning and creates no token on unsafe state %j", async (state, message) => {
    const { rows, links } = mockDb(existingBooking("Reservation created. Payment link not created: Original warning"));
    mocks.state.mockResolvedValue(state);
    await expect(createOwnerPaymentLink(7)).rejects.toThrow(message as string);
    expect(rows[0].ownerCreateError).toContain("Original warning");
    expect(links).toHaveLength(0);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("owner campaign coupon capacity and new policy snapshots", () => {
  const couponInput = () => ({ ...input(), discountCodeId: 11, discountAmount: 40, totalAmount: 460 });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendar.mockResolvedValue(["2027-01-10", "2027-01-11"].map(date => ({ date, isAvailable: true, status: "available" })));
    mocks.create.mockResolvedValue({ id: "123", status: "new" });
    mocks.sync.mockResolvedValue(undefined);
    mocks.discountReconcile.mockResolvedValue(undefined);
    mocks.discountReserve.mockResolvedValue({ claim: { id: "owner-claim" }, discountAmount: 40 });
    mocks.discountRelease.mockResolvedValue(undefined);
    mocks.discountSettle.mockResolvedValue(undefined);
  });
  it("rejects an exhausted coupon before creating a booking or provider reservation", async () => {
    const { rows } = mockDb();
    mocks.discountReserve.mockRejectedValue(new Error("Guest lifetime limit reached"));
    await expect(createOwnerBooking(couponInput(), "owner")).rejects.toThrow("lifetime limit");
    expect(rows).toHaveLength(0);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reserves unpaid owner coupon capacity, binds it atomically, and does not count a successful payment", async () => {
    const { policies, claimBindings } = mockDb();
    expect(await createOwnerBooking(couponInput(), "owner")).toMatchObject({ status: "confirmed", paymentStatus: "unpaid", balanceDue: 460 });
    expect(mocks.discountReserve).toHaveBeenCalledWith(expect.objectContaining({ codeId: 11, guestEmail: "guest@example.com", propertyId: "private", nightlySubtotal: 400, expectedAmount: 40, checkoutKey: expect.stringMatching(/^owner:/) }));
    expect(claimBindings).toEqual([{ bookingId: 7 }]);
    expect(policies[0]).toMatchObject({ bookingId: 7, acceptedAt: null });
    expect(mocks.discountSettle).not.toHaveBeenCalled();
  });
  it("counts an actually fully paid confirmed owner coupon through the dedicated settlement helper", async () => {
    mockDb();
    expect(await createOwnerBooking({ ...couponInput(), amountReceived: 460, paymentReference: "Bank receipt" }, "owner")).toMatchObject({ paymentStatus: "paid" });
    expect(mocks.discountSettle).toHaveBeenCalledTimes(1);
    expect(mocks.discountSettle).toHaveBeenCalledWith(7);
  });
  it("retains a claim and receipt when Hostaway creation is uncertain", async () => {
    mockDb(); mocks.create.mockRejectedValue(new Error("timeout"));
    expect(await createOwnerBooking(couponInput(), "owner")).toMatchObject({ status: "pending" });
    expect(mocks.discountRelease).not.toHaveBeenCalled();
    expect(mocks.discountSettle).not.toHaveBeenCalled();
  });
  it("releases capacity on definitive local transaction failure before any provider POST", async () => {
    const { db } = mockDb(); db.transaction = vi.fn().mockRejectedValue(new Error("local failure"));
    await expect(createOwnerBooking(couponInput(), "owner")).rejects.toThrow("local failure");
    expect(mocks.discountRelease).toHaveBeenCalledWith("owner-claim");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not represent coupon reconciliation failure as failed reservation creation", async () => {
    mockDb(); mocks.discountSettle.mockRejectedValue(new Error("ledger unavailable"));
    const result = await createOwnerBooking({ ...couponInput(), amountReceived: 460, paymentReference: "Bank receipt" }, "owner");
    expect(result).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
    expect(result.error).toContain("do not recreate");
  });
  it("leaves bespoke owner credits separate from campaign coupon caps", async () => {
    mockDb(); await createOwnerBooking({ ...input(), discountAmount: 40, totalAmount: 460 }, "owner");
    expect(mocks.discountReserve).not.toHaveBeenCalled();
    expect(mocks.discountReconcile).not.toHaveBeenCalled();
  });
});
