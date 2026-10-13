import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb, mockGetPropertyCalendar, mockQuoteHostawayStay } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetPropertyCalendar: vi.fn(),
  mockQuoteHostawayStay: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mockGetDb }));
vi.mock("./hostaway", () => ({
  PROPERTY_TO_HOSTAWAY_ID: { "the-briar": 329641, "alamo-house": 329644 },
  getPropertyCalendar: mockGetPropertyCalendar,
}));
vi.mock("./hostaway-booking", () => ({
  cancelHostawayReservation: vi.fn(),
  createHostawayReservation: vi.fn(),
  quoteHostawayStay: mockQuoteHostawayStay,
  recordHostawayStripePayment: vi.fn(),
  updateHostawayReservationForStayChange: vi.fn(),
}));

import { quoteBookingChange } from "./booking-changes";

const booking = {
  id: 19,
  propertyId: "the-briar",
  hostawayListingId: 329641,
  hostawayReservationId: "64756333",
  guestName: "Example Guest",
  guestEmail: "guest@example.com",
  guestPhone: "5551112222",
  guestCount: 2,
  checkIn: Date.parse("2026-11-01T00:00:00Z"),
  checkOut: Date.parse("2026-11-04T00:00:00Z"),
  totalAmount: "650.00",
  status: "confirmed",
};

function readDb(row = booking) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [row] }),
      }),
    }),
  };
}

describe("reservation change quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue(readDb());
    mockGetPropertyCalendar.mockResolvedValue([
      { date: "2026-11-04", isAvailable: true, status: "available", price: 200, minimumStay: 1 },
      { date: "2026-11-05", isAvailable: true, status: "available", price: 200, minimumStay: 1 },
      { date: "2026-11-06", isAvailable: true, status: "available", price: 200, minimumStay: 1 },
    ]);
    mockQuoteHostawayStay.mockResolvedValue({
      totalPrice: 725,
      components: [{ name: "baseRate", type: "accommodation", total: 550, isIncludedInTotalPrice: 1 }],
    });
  });

  it("uses live Hostaway pricing and applies the original payment as credit", async () => {
    const quote = await quoteBookingChange({
      bookingId: 19,
      propertyId: "alamo-house",
      newCheckIn: Date.parse("2026-11-04T00:00:00Z"),
      newCheckOut: Date.parse("2026-11-07T00:00:00Z"),
    });

    expect(mockQuoteHostawayStay).toHaveBeenCalledWith({
      hostawayListingId: 329644,
      checkIn: "2026-11-04",
      checkOut: "2026-11-07",
      guestCount: 2,
    });
    expect(quote).toMatchObject({
      newNights: 3,
      originalTotal: 650,
      revisedTotal: 725,
      creditApplied: 650,
      balanceDue: 75,
      refundAmount: 0,
    });
  });

  it("does not quote a destination stay when Hostaway says a required night is unavailable", async () => {
    mockGetPropertyCalendar.mockResolvedValue([
      { date: "2026-11-04", isAvailable: true, status: "available", price: 200, minimumStay: 1 },
      { date: "2026-11-05", isAvailable: false, status: "reserved", price: 200, minimumStay: 1 },
    ]);

    await expect(quoteBookingChange({
      bookingId: 19,
      propertyId: "alamo-house",
      newCheckIn: Date.parse("2026-11-04T00:00:00Z"),
      newCheckOut: Date.parse("2026-11-06T00:00:00Z"),
    })).rejects.toThrow("unavailable on 2026-11-05");
    expect(mockQuoteHostawayStay).not.toHaveBeenCalled();
  });
});
