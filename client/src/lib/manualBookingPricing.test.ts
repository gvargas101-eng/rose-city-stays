import { describe, expect, it } from "vitest";
import { getStayPriceSummary } from "./manualBookingPricing";

describe("getStayPriceSummary", () => {
  it("uses only selected stay nights and excludes check-out", () => {
    const summary = getStayPriceSummary([
      { date: "2026-10-29", price: 150 },
      { date: "2026-10-30", price: 175 },
      { date: "2026-10-31", price: 200 },
      { date: "2026-11-01", price: 999 },
    ], "2026-10-29", "2026-11-01");

    expect(summary).toEqual({
      nightlyRate: 175,
      lodgingTotal: 525,
      pricedNights: 3,
    });
  });

  it("does not return a live rate when Hostaway lacks a selected-night price", () => {
    expect(getStayPriceSummary([
      { date: "2026-10-29", price: 150 },
      { date: "2026-10-30", price: 0 },
    ], "2026-10-29", "2026-10-31")).toBeNull();
  });
});
