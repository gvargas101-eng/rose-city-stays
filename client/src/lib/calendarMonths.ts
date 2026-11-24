import type { CalendarDay } from "./calendarDates";

export interface CalendarMonthSegment {
  key: string;
  label: string;
  shortLabel: string;
  startCol: number;
  dayCount: number;
  toneIndex: number;
}

// Soft month backgrounds are deliberately separate from saturated channel colors.
const MONTH_TONES = [
  {
    header: "bg-teal-100 text-teal-950 dark:bg-teal-950 dark:text-teal-100",
    day: "bg-teal-50 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100",
    weekend: "bg-teal-100/80 text-teal-950 dark:bg-teal-900/60 dark:text-teal-100",
    grid: "bg-teal-50/60 dark:bg-teal-950/20",
    boundary: "border-teal-400 dark:border-teal-600",
    chip: "bg-teal-50 text-teal-950 border-teal-300 dark:bg-teal-950/50 dark:text-teal-100 dark:border-teal-700",
  },
  {
    header: "bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100",
    day: "bg-violet-50 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100",
    weekend: "bg-violet-100/80 text-violet-950 dark:bg-violet-900/60 dark:text-violet-100",
    grid: "bg-violet-50/60 dark:bg-violet-950/20",
    boundary: "border-violet-400 dark:border-violet-600",
    chip: "bg-violet-50 text-violet-950 border-violet-300 dark:bg-violet-950/50 dark:text-violet-100 dark:border-violet-700",
  },
  {
    header: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    day: "bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
    weekend: "bg-amber-100/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100",
    grid: "bg-amber-50/60 dark:bg-amber-950/20",
    boundary: "border-amber-400 dark:border-amber-600",
    chip: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-700",
  },
  {
    header: "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
    day: "bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
    weekend: "bg-sky-100/80 text-sky-950 dark:bg-sky-900/60 dark:text-sky-100",
    grid: "bg-sky-50/60 dark:bg-sky-950/20",
    boundary: "border-sky-400 dark:border-sky-600",
    chip: "bg-sky-50 text-sky-950 border-sky-300 dark:bg-sky-950/50 dark:text-sky-100 dark:border-sky-700",
  },
] as const;

export function getCalendarMonthTone(key: string) {
  const month = Number(key.slice(5, 7));
  return MONTH_TONES[(month - 1) % MONTH_TONES.length] ?? MONTH_TONES[0];
}

/** Group the real UTC timeline, so widths remain correct for leap years and 31-day months. */
export function getCalendarMonthSegments(days: CalendarDay[]): CalendarMonthSegment[] {
  const segments: CalendarMonthSegment[] = [];
  days.forEach((day, index) => {
    const key = day.date.slice(0, 7);
    const previous = segments.at(-1);
    if (previous?.key === key) {
      previous.dayCount += 1;
      return;
    }
    const date = new Date(`${key}-01T00:00:00Z`);
    segments.push({
      key,
      label: date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      shortLabel: date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
      startCol: index,
      dayCount: 1,
      toneIndex: date.getUTCMonth() % MONTH_TONES.length,
    });
  });
  return segments;
}
