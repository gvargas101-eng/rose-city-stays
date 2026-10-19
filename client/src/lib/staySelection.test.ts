import { describe, expect, it } from "vitest";
import type { CalendarDay } from "./calendar-types";
import { validateStaySelection } from "./staySelection";

const calendarDays: CalendarDay[] = [
  { date: "2026-10-20", isAvailable: true, status: "available", price: 150, minimumStay: 2 },
  { date: "2026-10-21", isAvailable: true, status: "available", price: 200, minimumStay: 1 },
  { date: "2026-10-22", isAvailable: true, status: "available", price: 250, minimumStay: 1 },
  { date: "2026-10-23", isAvailable: false, status: "reserved", price: 0, minimumStay: 1 },
];

describe("validateStaySelection", () => {
  it("validates available nights and excludes checkout day from the average rate", () => {
    const result = validateStaySelection({
      checkInDate: "2026-10-20",
      checkOutDate: "2026-10-22",
      calendarDays,
      minStay: 1,
      minStayMap: { "2026-10-20": 2 },
    });

    expect(result).toEqual({
      valid: true,
      selection: expect.objectContaining({
        nights: 2,
        avgNightlyRate: 175,
      }),
    });
  });

  it("rejects selections shorter than the check-in date minimum stay", () => {
    expect(validateStaySelection({
      checkInDate: "2026-10-20",
      checkOutDate: "2026-10-21",
      calendarDays,
      minStay: 1,
      minStayMap: { "2026-10-20": 2 },
    })).toEqual({ valid: false, reason: "minimum-stay" });
  });

  it("rejects a selected stay with an unavailable overnight date", () => {
    expect(validateStaySelection({
      checkInDate: "2026-10-21",
      checkOutDate: "2026-10-24",
      calendarDays,
    })).toEqual({ valid: false, reason: "unavailable" });
  });
});
