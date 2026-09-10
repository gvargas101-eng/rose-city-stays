import { describe, expect, it } from "vitest";
import { getUtcMonthDays } from "./calendarDates";

describe("getUtcMonthDays", () => {
  it("includes October 31 in a 31-day month", () => {
    const days = getUtcMonthDays(2026, 9);

    expect(days).toHaveLength(31);
    expect(days.at(-1)).toEqual({
      date: "2026-10-31",
      dayNum: 31,
      dayOfWeek: 6,
    });
  });

  it("keeps February at its correct month length", () => {
    expect(getUtcMonthDays(2026, 1)).toHaveLength(28);
    expect(getUtcMonthDays(2028, 1)).toHaveLength(29);
  });
});
