export interface CalendarDay {
  date: string;
  dayNum: number;
  dayOfWeek: number;
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds every day in a UTC month, including the 29th–31st where applicable.
 * Constructing each date from its numeric day avoids local-timezone rollover.
 */
export function getUtcMonthDays(year: number, month: number): CalendarDay[] {
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return Array.from({ length: count }, (_, index) => {
    const dayNum = index + 1;
    const date = new Date(Date.UTC(year, month, dayNum));
    return {
      date: toYMD(date),
      dayNum,
      dayOfWeek: date.getUTCDay(),
    };
  });
}
