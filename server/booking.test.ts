/**
 * Unit tests for the booking tRPC router procedures.
 * Stripe, Hostaway, DB, and notifications are all mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock Stripe ──────────────────────────────────────────────────────────────
const mockPaymentIntentCreate = vi.fn();
const mockPaymentIntentRetrieve = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentCreate,
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
const mockInsertValues = vi.fn().mockResolvedValue([{ insertId: 42 }]);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

let mockBookingRow: Record<string, unknown> = {};
const mockSelectLimit = vi.fn().mockImplementation(() => Promise.resolve([mockBookingRow]));
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
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
  procedure: "createPaymentIntent" | "confirmBooking" | "getByPaymentIntent",
  input: Record<string, unknown>
) {
  const proc = bookingRouter[procedure] as any;
  // tRPC procedures expose ._def.resolver for testing
  return proc._def.resolver({ input, ctx: {} });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("bookingRouter.createPaymentIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a PaymentIntent and returns clientSecret + totals", async () => {
    mockPaymentIntentCreate.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_test_123_secret",
    });

    const result = await callProcedure("createPaymentIntent", {
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
    });

    expect(mockPaymentIntentCreate).toHaveBeenCalledOnce();
    expect(result.clientSecret).toBe("pi_test_123_secret");
    expect(result.bookingId).toBe("pi_test_123");
    // 3 nights × $116 = $348 + $150 cleaning = $498
    expect(result.subtotal).toBe(348);
    expect(result.cleaningFee).toBe(150);
    expect(result.totalAmount).toBe(498);
  });

  it("inserts a pending booking record into the database", async () => {
    mockPaymentIntentCreate.mockResolvedValue({
      id: "pi_test_456",
      client_secret: "pi_test_456_secret",
    });

    await callProcedure("createPaymentIntent", {
      propertyId: "the-briar",
      propertyName: "The Briar",
      checkIn: "2026-07-10",
      checkOut: "2026-07-13",
      nights: 3,
      nightlyRate: 134,
      guestCount: 4,
      guestName: "Bob Smith",
      guestEmail: "bob@example.com",
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "the-briar",
        guestName: "Bob Smith",
        guestEmail: "bob@example.com",
        status: "pending",
        stripePaymentIntentId: "pi_test_456",
      })
    );
  });

  it("throws if property is not found in PROPERTY_TO_HOSTAWAY_ID map", async () => {
    await expect(
      callProcedure("createPaymentIntent", {
        propertyId: "nonexistent-property",
        propertyName: "Ghost House",
        checkIn: "2026-06-01",
        checkOut: "2026-06-04",
        nights: 3,
        nightlyRate: 100,
        guestCount: 2,
        guestName: "Ghost",
        guestEmail: "ghost@example.com",
      })
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
