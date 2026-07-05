/**
 * Unit tests for the booking tRPC router procedures.
 * Stripe, Hostaway, DB, and notifications are all mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Stripe ──────────────────────────────────────────────────────────────
const mockCheckoutSessionCreate = vi.fn();
const mockCheckoutSessionRetrieve = vi.fn();
const mockPaymentIntentRetrieve = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionCreate,
        retrieve: mockCheckoutSessionRetrieve,
      },
    },
    paymentIntents: {
      retrieve: mockPaymentIntentRetrieve,
    },
  })),
}));

// ── Mock Hostaway booking ────────────────────────────────────────────────────
const mockCreateHostawayReservation = vi.fn();
vi.mock("./hostaway-booking", () => ({
  createHostawayReservation: mockCreateHostawayReservation,
}));

// ── Mock DB ──────────────────────────────────────────────────────────────────
const mockInsertReturningId = vi.fn().mockResolvedValue([{ id: 42 }]);
const mockInsertValues = vi.fn().mockReturnValue({ $returningId: mockInsertReturningId });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

let mockBookingRow: Record<string, unknown> = {};
// mockSelectResult controls what .limit(1) returns; defaults to mockBookingRow.
// For getCleaningFee (properties table) we return a property row with cleaningFee.
const mockSelectLimit = vi.fn().mockImplementation(() => Promise.resolve([mockBookingRow]));
const mockSelectOrderBy = vi.fn().mockImplementation(() => Promise.resolve([]));
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
// from() is called with different tables; return a chainable object that works for each
const mockSelectFrom = vi.fn().mockImplementation((table: unknown) => {
  const tableAny = table as any;
  // bookings table — has BOTH cleaningFee AND stripePaymentIntentId
  if (tableAny?.stripePaymentIntentId) {
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve([mockBookingRow])),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
      orderBy: vi.fn().mockResolvedValue([]),
    };
  }
  // properties table (getCleaningFee) — has cleaningFee but NOT stripePaymentIntentId
  if (tableAny?.cleaningFee) {
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ cleaningFee: "150.00" }]),
      }),
    };
  }
  // site_settings table (getTaxRate) — has a key column
  if (tableAny?.key) {
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ value: "0.0900" }]),
      }),
    };
  }
  // custom_fees table (getActiveCustomFeeLines) — fallback, returns empty array
  return {
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockResolvedValue([]),
    }),
    orderBy: vi.fn().mockResolvedValue([]),
  };
});
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  }),
}));

// ── Mock notification ─────────────────────────────────────────────────────────
const mockNotifyOwner = vi.fn().mockResolvedValue(true);
vi.mock("./_core/notification", () => ({
  notifyOwner: mockNotifyOwner,
}));

// ── Import router under test ──────────────────────────────────────────────────
// We import after mocks are set up
const { bookingRouter } = await import("./routers/booking");

// Helper: call a procedure directly (bypasses tRPC HTTP layer)
async function callProcedure(
  procedure: "createCheckoutSession" | "confirmBooking" | "getByPaymentIntent",
  input: Record<string, unknown>,
  ctx: Record<string, unknown> = {}
) {
  const proc = bookingRouter[procedure] as any;
  // tRPC procedures expose ._def.resolver for testing
  return proc._def.resolver({ input, ctx });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("bookingRouter.createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Checkout Session and returns checkoutUrl + totals", async () => {
    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const result = await callProcedure(
      "createCheckoutSession",
      {
        propertyId: "hollytree-golf-dining",
        propertyName: "Hollytree Golf",
        checkIn: "2026-06-01",
        checkOut: "2026-06-04",
        nights: 3,
        nightlyRate: 116,
        guestCount: 2,
        guestName: "Jane Doe",
        guestEmail: "jane@example.com",
        guestPhone: "555-0100",
        message: "Early check-in please",
      },
      { req: { headers: { origin: "https://rosecitystays.com" } } }
    );

    expect(mockCheckoutSessionCreate).toHaveBeenCalledOnce();
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(result.sessionId).toBe("cs_test_123");
    expect(result.bookingId).toBe(42);
    // 3 nights × $116 = $348
    expect(result.subtotal).toBe(348);
    expect(result.cleaningFee).toBe(150);
  });

  it("inserts a pending booking record into the database", async () => {
    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/pay/cs_test_456",
    });

    await callProcedure(
      "createCheckoutSession",
      {
        propertyId: "the-briar",
        propertyName: "The Briar",
        checkIn: "2026-07-10",
        checkOut: "2026-07-13",
        nights: 3,
        nightlyRate: 134,
        guestCount: 4,
        guestName: "Bob Smith",
        guestEmail: "bob@example.com",
      },
      { req: { headers: { origin: "https://rosecitystays.com" } } }
    );

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "the-briar",
        guestName: "Bob Smith",
        guestEmail: "bob@example.com",
        status: "pending",
      })
    );
  });

  it("throws if property is not found in PROPERTY_TO_HOSTAWAY_ID map", async () => {
    await expect(
      callProcedure(
        "createCheckoutSession",
        {
          propertyId: "nonexistent-property",
          propertyName: "Ghost House",
          checkIn: "2026-06-01",
          checkOut: "2026-06-04",
          nights: 3,
          nightlyRate: 100,
          guestCount: 2,
          guestName: "Ghost",
          guestEmail: "ghost@example.com",
        },
        { req: { headers: { origin: "https://rosecitystays.com" } } }
      )
    ).rejects.toThrow("Property not found: nonexistent-property");
  });
});

describe("bookingRouter.confirmBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookingRow = {
      id: 42,
      propertyId: "hollytree-golf-dining",
      hostawayListingId: 329643,
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      guestPhone: "555-0100",
      guestCount: 2,
      checkIn: new Date("2026-06-01").getTime(),
      checkOut: new Date("2026-06-04").getTime(),
      nights: 3,
      nightlyRate: "116",
      subtotal: "348",
      cleaningFee: "150",
      totalAmount: "498",
      stripePaymentIntentId: "pi_test_123",
      status: "pending",
      message: null,
      hostawayReservationId: null,
    };
  });

  it("confirms booking and creates Hostaway reservation on successful payment", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test_123",
      status: "succeeded",
    });
    mockCreateHostawayReservation.mockResolvedValue({ id: "HA-98765" });

    const result = await callProcedure("confirmBooking", {
      paymentIntentId: "pi_test_123",
    });

    expect(result.success).toBe(true);
    expect(result.hostawayReservationId).toBe("HA-98765");
    expect(mockCreateHostawayReservation).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockNotifyOwner).toHaveBeenCalledTimes(1); // success notification
  });

  it("throws if payment status is not succeeded", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test_fail",
      status: "requires_payment_method",
    });
    mockBookingRow = { ...mockBookingRow, stripePaymentIntentId: "pi_test_fail" };

    await expect(
      callProcedure("confirmBooking", { paymentIntentId: "pi_test_fail" })
    ).rejects.toThrow("Payment not completed");
  });

  it("still confirms booking if Hostaway reservation fails (notifies owner instead)", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test_123",
      status: "succeeded",
    });
    mockCreateHostawayReservation.mockRejectedValue(new Error("Hostaway API error"));

    const result = await callProcedure("confirmBooking", {
      paymentIntentId: "pi_test_123",
    });

    // Booking should still be confirmed even if Hostaway fails
    expect(result.success).toBe(true);
    expect(result.hostawayReservationId).toBeNull();
    // Owner should be notified of the Hostaway failure + the booking
    expect(mockNotifyOwner).toHaveBeenCalledTimes(2);
  });

  it("returns idempotently if booking is already confirmed", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({
      id: "pi_test_123",
      status: "succeeded",
    });
    mockBookingRow = { ...mockBookingRow, status: "confirmed", hostawayReservationId: "HA-98765" };

    const result = await callProcedure("confirmBooking", {
      paymentIntentId: "pi_test_123",
    });

    expect(result.success).toBe(true);
    expect(result.hostawayReservationId).toBe("HA-98765");
    // Should NOT call Hostaway again
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
  });
});
