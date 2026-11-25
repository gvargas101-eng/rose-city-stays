/**
 * Unit tests for the booking tRPC router procedures.
 * Stripe, Hostaway, DB, and notifications are all mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

// ── Mock Stripe ──────────────────────────────────────────────────────────────
const mockCheckoutSessionCreate = vi.fn();
const mockCheckoutSessionRetrieve = vi.fn();
const mockPaymentIntentRetrieve = vi.fn();
const mockPaymentIntentCreate = vi.fn();
const mockCouponCreate = vi.fn().mockResolvedValue({ id: "coupon_owner_adjustment" });
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    coupons: { create: mockCouponCreate },
    checkout: {
      sessions: {
        create: mockCheckoutSessionCreate,
        retrieve: mockCheckoutSessionRetrieve,
      },
    },
    paymentIntents: {
      retrieve: mockPaymentIntentRetrieve,
      create: mockPaymentIntentCreate,
    },
  })),
}));

// ── Mock Hostaway booking ────────────────────────────────────────────────────
const mockCreateHostawayReservation = vi.fn();
const mockRecordHostawayStripePayment = vi.fn().mockResolvedValue({ id: "charge_1", status: "paid" });
vi.mock("./hostaway-booking", () => ({
  createHostawayReservation: mockCreateHostawayReservation,
  recordHostawayStripePayment: mockRecordHostawayStripePayment,
}));

// ── Mock Hostaway calendar (availability check) ───────────────────────────────
// Default: all days available so tests pass the availability guard.
// Individual tests can override mockGetPropertyCalendar to simulate blocked dates.
const mockGetPropertyCalendar = vi.fn().mockResolvedValue([]);
vi.mock("./hostaway", () => ({
  PROPERTY_TO_HOSTAWAY_ID: {
    "the-briar": 329641,
    "hospital-district": 329642,
    "hollytree-golf-dining": 329643,
    "alamo-house": 329644,
    "green-acres": 329645,
    "legacy-house": 329646,
    "azalea-spring-cottage": 329647,
    "noir-hollytree": 329648,
    "hollytree-king-bed": 329649,
    "hollytree-townhouse": 366803,
    "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys": 560227,
    "alamo-crossing-retreat": 630308,
  },
  getPropertyCalendar: mockGetPropertyCalendar,
}));

// ── Mock DB ──────────────────────────────────────────────────────────────────
const mockInsertReturningId = vi.fn().mockResolvedValue([{ id: 42 }]);
const mockInsertValues = vi.fn().mockReturnValue({ $returningId: mockInsertReturningId });
let mockPolicyRows: any[] = [];
const mockPolicyWrite = vi.fn();
const mockInsert = vi.fn().mockImplementation((table: any) => table?.policyText ? {
  values: (values: any) => ({ onDuplicateKeyUpdate: async () => { mockPolicyWrite(values); mockPolicyRows.push({ id: 1, ...values }); } }),
} : { values: mockInsertValues });
beforeEach(() => { mockPolicyRows = []; });

const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

let mockBookingRow: Record<string, unknown> = {};
let mockCleaningFee = "150.00";
let mockPropertyActive = 1;
let mockActiveCustomFees: Array<Record<string, unknown>> = [];
// mockSelectResult controls what .limit(1) returns; defaults to mockBookingRow.
// For getCleaningFee (properties table) we return a property row with cleaningFee.
const mockSelectLimit = vi.fn().mockImplementation(() => Promise.resolve([mockBookingRow]));
const mockSelectOrderBy = vi.fn().mockImplementation(() => Promise.resolve([]));
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit, orderBy: mockSelectOrderBy });
// from() is called with different tables; return a chainable object that works for each
const mockSelectFrom = vi.fn().mockImplementation((table: unknown) => {
  const tableAny = table as any;
  if (tableAny?.policyText) return { where: () => ({ limit: async () => mockPolicyRows }) };
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
  // manual_booking_links has a cleaningFee too, so identify it before the
  // properties-table fallback below.
  if (tableAny?.token && tableAny?.propertySlug) {
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve([mockBookingRow])),
      }),
    };
  }
  // properties table (getCleaningFee) — has cleaningFee but NOT stripePaymentIntentId
  if (tableAny?.cleaningFee) {
    return {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve([{ cleaningFee: mockCleaningFee, active: mockPropertyActive }])),
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
  // custom_fees table (getActiveCustomFeeLines)
  return {
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(mockActiveCustomFees),
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
  procedure: "createCheckoutSession" | "createManualBookingCheckout" | "confirmBooking" | "getByPaymentIntent",
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
    mockCleaningFee = "150.00";
    mockPropertyActive = 1;
    mockActiveCustomFees = [];
  });

  it("rejects public checkout for a private house before availability, Stripe, or booking creation", async () => {
    mockPropertyActive = 0;
    await expect(callProcedure("createCheckoutSession", {
      propertyId: "alamo-crossing-retreat",
      propertyName: "Alamo Crossing Retreat",
    })).rejects.toThrow("not available for public booking");
    expect(mockGetPropertyCalendar).not.toHaveBeenCalled();
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a direct checkout without a valid guest phone number", async () => {
    const caller = bookingRouter.createCaller({
      req: { headers: { origin: "https://www.rosecitystays.com" } },
    } as any);

    await expect(caller.createCheckoutSession({
      propertyId: "the-briar",
      propertyName: "The Briar",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      nights: 2,
      nightlyRate: 150,
      guestCount: 2,
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      guestPhone: "",
    } as any)).rejects.toThrow("Enter a valid phone number");
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
    const sessionInput = mockCheckoutSessionCreate.mock.calls[0][0];
    expect(sessionInput.customer_creation).toBe("always");
    expect(sessionInput.payment_intent_data.setup_future_usage).toBe("off_session");
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
        guestPhone: "555-0100",
        smsConsentAt: 1_786_262_400_000,
      },
      { req: { headers: { origin: "https://rosecitystays.com" } } }
    );

    expect(mockInsert.mock.calls.filter(([table]) => table?.stripePaymentIntentId)).toHaveLength(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "the-briar",
        guestName: "Bob Smith",
        guestEmail: "bob@example.com",
        guestPhone: "555-0100",
        smsConsentAt: 1_786_262_400_000,
        status: "pending",
      })
    );
    // Four guests are included. No extra-guest line item may reach Stripe.
    const sessionInput = mockCheckoutSessionCreate.mock.calls[0][0];
    expect(sessionInput.line_items.some((line: any) => line.price_data.product_data.name === "Extra guest fee")).toBe(false);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: "588.18" })
    );
  });

  it("does not apply a legacy flat extra-guest custom fee to four guests", async () => {
    mockActiveCustomFees = [{
      id: 1,
      name: "Extra Guest Fee",
      description: "Applies when more than 4 guests",
      type: "flat",
      amount: "25.00",
      sortOrder: 0,
    }];
    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_test_four_guests",
      url: "https://checkout.stripe.com/pay/cs_test_four_guests",
    });

    await callProcedure(
      "createCheckoutSession",
      {
        propertyId: "the-briar",
        propertyName: "The Briar",
        checkIn: "2026-10-01",
        checkOut: "2026-10-04",
        nights: 3,
        nightlyRate: 150,
        guestCount: 4,
        guestName: "Four Guest Test",
        guestEmail: "four@example.com",
        guestPhone: "555-0100",
      },
      { req: { headers: { origin: "https://www.rosecitystays.com" } } }
    );

    const lineItemNames = mockCheckoutSessionCreate.mock.calls[0][0].line_items
      .map((line: any) => line.price_data.product_data.name);
    expect(lineItemNames).not.toContain("Extra Guest Fee");
    expect(lineItemNames.some((name: string) => name.startsWith("Extra guests"))).toBe(false);
  });

  it("uses the saved per-property cleaning fee in the Stripe checkout", async () => {
    mockCleaningFee = "125.00";
    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_test_cleaning_fee",
      url: "https://checkout.stripe.com/pay/cs_test_cleaning_fee",
    });

    const result = await callProcedure(
      "createCheckoutSession",
      {
        propertyId: "hospital-district",
        propertyName: "Hospital District Retreat",
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
        nights: 2,
        nightlyRate: 100,
        guestCount: 2,
        guestName: "Cleaning Fee Test",
        guestEmail: "cleaning@example.com",
      },
      { req: { headers: { origin: "https://www.rosecitystays.com" } } }
    );

    expect(result.cleaningFee).toBe(125);
    const cleaningLine = mockCheckoutSessionCreate.mock.calls[0][0].line_items
      .find((line: any) => line.price_data.product_data.name === "Cleaning fee");
    expect(cleaningLine.price_data.unit_amount).toBe(12500);
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
    expect(mockCreateHostawayReservation).toHaveBeenCalledWith(expect.objectContaining({
      guestPhone: "555-0100",
    }));
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

  it("never recreates a canceled reservation from a legacy paid confirmation", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({ id: "pi_test_123", status: "succeeded" });
    mockBookingRow = { ...mockBookingRow, status: "cancelled", hostawayReservationId: "HA-98765" };
    await expect(callProcedure("confirmBooking", { paymentIntentId: "pi_test_123" })).rejects.toThrow("canceled");
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("preserves a cancellation that arrives during Hostaway confirmation atomically", async () => {
    mockPaymentIntentRetrieve.mockResolvedValue({ id: "pi_test_123", status: "succeeded" });
    mockCreateHostawayReservation.mockImplementationOnce(async () => {
      mockBookingRow = { ...mockBookingRow, status: "cancelled", hostawayReservationId: "HA-98765" };
      return { id: "HA-98765" };
    });
    await expect(callProcedure("confirmBooking", { paymentIntentId: "pi_test_123" })).rejects.toThrow("canceled");
    const condition = mockUpdateSet.mock.results[0].value.where.mock.calls[0][0];
    const query = new MySqlDialect().sqlToQuery(condition);
    expect(query.sql).toContain("`bookings`.`status` <>");
    expect(query.params).toContain("cancelled");
    expect(mockNotifyOwner).not.toHaveBeenCalled();
    expect(mockPaymentIntentCreate).not.toHaveBeenCalled();
  });

  it("acknowledges replayed paid Stripe events without reviving cancellation or creating deposit holds", async () => {
    mockBookingRow = { ...mockBookingRow, status: "cancelled", hostawayReservationId: "HA-98765" };
    const { confirmStripeCheckoutSession } = await import("./routers/booking");
    const result = await confirmStripeCheckoutSession({ id: "cs_replayed", client_reference_id: "42", payment_status: "paid", payment_intent: "pi_test_123" } as any);
    expect(result).toEqual({ success: true, cancelled: true });
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
    expect(mockPaymentIntentCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("bookingRouter.createManualBookingCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyActive = 0; // Manual links must work even when public booking is disabled.
    mockGetPropertyCalendar.mockResolvedValue([]);
    mockBookingRow = {
      id: 99,
      token: "manual-token",
      propertySlug: "the-briar",
      propertyName: "The Briar",
      hostawayListingId: 329641,
      checkIn: new Date("2026-10-10T00:00:00Z").getTime(),
      checkOut: new Date("2026-10-13T00:00:00Z").getTime(),
      nights: 3,
      guestCount: 2,
      nightlyRate: "150.00",
      cleaningFee: "125.00",
      discountAmount: "0.00",
      extraGuestFee: "0.00",
      taxAmount: "40.50",
      totalAmount: "615.50",
      bypassAvailabilityCheck: 0,
      status: "active",
      expiresAt: Date.now() + 86_400_000,
    };
  });

  it("allows an owner-created private house link without creating a Hostaway reservation before payment", async () => {
    mockBookingRow = { ...mockBookingRow, propertySlug: "alamo-crossing-retreat", propertyName: "Alamo Crossing Retreat", hostawayListingId: 630308 };
    mockCheckoutSessionCreate.mockResolvedValue({ id: "cs_private", url: "https://checkout.stripe.com/pay/cs_private" });
    const result = await callProcedure("createManualBookingCheckout", {
      token: "manual-token", guestName: "Private Guest", guestEmail: "private@example.com", guestPhone: "555-0100", origin: "https://www.rosecitystays.com",
    });
    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_private");
    expect(mockGetPropertyCalendar).toHaveBeenCalledWith("alamo-crossing-retreat", "2026-10-10", "2026-10-13");
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
  });

  it("still blocks unavailable nights on a private house link before Stripe checkout", async () => {
    mockBookingRow = { ...mockBookingRow, propertySlug: "alamo-crossing-retreat", propertyName: "Alamo Crossing Retreat", hostawayListingId: 630308 };
    mockGetPropertyCalendar.mockResolvedValue([{ date: "2026-10-10", isAvailable: false, status: "reserved", price: 185, minimumStay: 1 }]);
    await expect(callProcedure("createManualBookingCheckout", {
      token: "manual-token", guestName: "Private Guest", guestEmail: "private@example.com", guestPhone: "555-0100", origin: "https://www.rosecitystays.com",
    })).rejects.toThrow("no longer available");
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled();
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
  });

  it("saves the customer payment method so a manual booking can create its deposit hold", async () => {
    mockCheckoutSessionCreate.mockResolvedValue({
      id: "cs_manual_deposit",
      url: "https://checkout.stripe.com/pay/cs_manual_deposit",
    });

    const result = await callProcedure("createManualBookingCheckout", {
      token: "manual-token",
      guestName: "Manual Guest",
      guestEmail: "manual@example.com",
      guestPhone: "555-0100",
      origin: "https://www.rosecitystays.com",
    });

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_manual_deposit");
    const sessionInput = mockCheckoutSessionCreate.mock.calls[0][0];
    expect(sessionInput.customer_creation).toBe("always");
    expect(sessionInput.payment_intent_data.setup_future_usage).toBe("off_session");
    expect(sessionInput.metadata.manual_booking_token).toBe("manual-token");
  });

  it("collects the exact net price with multiple credits, a nightly discount, and a custom charge", async () => {
    mockBookingRow = { ...mockBookingRow, discountAmount: "45.00", discountLabel: "10% nightly discount", totalAmount: "525.50",
      customLineItems: JSON.stringify([{ label: "Pet fee", amount: 50 }, { label: "Courtesy credit", amount: -70 }, { label: "Cleaning credit", amount: -25 }]) };
    mockCheckoutSessionCreate.mockResolvedValue({ id: "cs_credit", url: "https://checkout.stripe.com/pay/cs_credit" });
    await callProcedure("createManualBookingCheckout", { token: "manual-token", guestName: "Guest", guestEmail: "guest@example.com", origin: "https://www.rosecitystays.com" });
    expect(mockCouponCreate).toHaveBeenCalledWith(expect.objectContaining({ amount_off: 14000, name: "Owner credits & discounts" }));
    const input = mockCheckoutSessionCreate.mock.calls[0][0];
    expect(input.line_items.every((line: any) => line.price_data.unit_amount >= 0)).toBe(true);
    expect(input.line_items.reduce((sum: number, line: any) => sum + line.price_data.unit_amount, 0) - 14000).toBe(52550);
    expect(input.discounts).toEqual([{ coupon: "coupon_owner_adjustment" }]);
    expect(input.allow_promotion_codes).toBeUndefined();
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
  });

  it("blocks excessive credits or a mismatched saved total before Stripe or Hostaway", async () => {
    mockBookingRow = { ...mockBookingRow, customLineItems: JSON.stringify([{ label: "Credit", amount: -615.5 }]), totalAmount: "0" };
    await expect(callProcedure("createManualBookingCheckout", { token: "manual-token", guestName: "Guest", guestEmail: "guest@example.com", origin: "https://www.rosecitystays.com" })).rejects.toThrow("at least $0.50");
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled();
    mockBookingRow = { ...mockBookingRow, customLineItems: null, totalAmount: "100.00" };
    await expect(callProcedure("createManualBookingCheckout", { token: "manual-token", guestName: "Guest", guestEmail: "guest@example.com", origin: "https://www.rosecitystays.com" })).rejects.toThrow("itemized pricing");
    expect(mockCheckoutSessionCreate).not.toHaveBeenCalled();
    expect(mockCreateHostawayReservation).not.toHaveBeenCalled();
  });
});
