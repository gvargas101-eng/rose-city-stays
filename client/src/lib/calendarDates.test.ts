import { describe, expect, it } from "vitest";
import { getUtcMonthDays, getUtcTimelineDays } from "./calendarDates";

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

  it("builds one continuous timeline across month and year boundaries", () => {
    const days = getUtcTimelineDays(2026, 10, 3);

    expect(days).toHaveLength(92);
    expect(days[0]?.date).toBe("2026-11-01");
    expect(days[30]?.date).toBe("2026-12-01");
    expect(days.at(-1)?.date).toBe("2027-01-31");
  });
});
