import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  bookings,
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
        return [{ insertId: id }];
      },
    }),
    update: (table: any) => ({
      set: (value: any) => ({
        where: async () => {
          if (table === bookings) Object.assign(rows[0], value);
        },
      }),
    }),
    transaction: async (f: any) => f(db),
  };
  mocks.getDb.mockResolvedValue(db);
  return { db, rows, receipts, links };
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
