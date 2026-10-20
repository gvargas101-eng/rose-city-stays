import { describe, expect, it } from "vitest";
import type { CalendarDay } from "./calendar-types";
import { calculateStayEstimate, getBestValueNightlyRate } from "./stayEstimate";

const selection = {
  checkIn: new Date("2026-10-20T00:00:00"),
  checkOut: new Date("2026-10-22T00:00:00"),
  nights: 2,
  avgNightlyRate: 150,
};

describe("calculateStayEstimate", () => {
  it("includes nightly charges, cleaning, occupancy tax, guest overage, and active fees", () => {
    expect(calculateStayEstimate({
      selection,
      cleaningFee: 125,
      taxRate: 0.09,
      guestCount: 6,
      customFees: [
        { id: 1, name: "Booking fee", type: "flat", amount: 20 },
        { id: 2, name: "Service fee", type: "percent", amount: 5 },
      ],
    })).toEqual({
      nightlySubtotal: 300,
      cleaningFee: 125,
      taxAmount: 27,
      customFeesTotal: 35,
      extraGuestFee: 40,
      total: 527,
      guestCount: 6,
      extraGuestCount: 2,
    });
  });

  it("does not add an extra guest fee for four or fewer guests", () => {
    const estimate = calculateStayEstimate({ selection, cleaningFee: 125, taxRate: 0.09, guestCount: 4 });
    expect(estimate.extraGuestFee).toBe(0);
    expect(estimate.total).toBe(452);
  });
});

describe("getBestValueNightlyRate", () => {
  it("returns the lowest price from available nights only", () => {
    const days: CalendarDay[] = [
      { date: "2026-10-20", isAvailable: true, status: "available", price: 169, minimumStay: 2 },
      { date: "2026-10-21", isAvailable: false, status: "blocked", price: 99, minimumStay: 2 },
      { date: "2026-10-22", isAvailable: true, status: "available", price: 134, minimumStay: 2 },
    ];
    expect(getBestValueNightlyRate(days)).toBe(134);
  });

  it("returns null when no visible bookable rate is available", () => {
    expect(getBestValueNightlyRate([])).toBeNull();
  });
});
