/**
 * DateRangePicker — lets guests select a Hostaway-valid check-in/check-out range.
 */

import { useCallback, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { differenceInCalendarDays, format, isBefore, startOfDay } from "date-fns";
import "react-day-picker/style.css";
import type { CalendarDay } from "@/lib/calendar-types";
import { validateStaySelection, type StaySelection } from "@/lib/staySelection";

interface DateRangePickerProps {
  calendarDays: CalendarDay[];
  onRangeChange: (range: StaySelection | null, checkInDateStr?: string) => void;
  /** Default minimum stay (used before a check-in date is selected) */
  minStay?: number;
  /** Per-date minimum stay map from Hostaway: date string -> minimumStay nights */
  minStayMap?: Record<string, number>;
}

export default function DateRangePicker({
  calendarDays,
  onRangeChange,
  minStay = 1,
  minStayMap = {},
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [tooShort, setTooShort] = useState(false);
  const [effectiveMin, setEffectiveMin] = useState(minStay);
  const today = startOfDay(new Date());

  const unavailableDates = new Set(
    calendarDays.filter((day) => !day.isAvailable).map((day) => day.date)
  );

  const isDateDisabled = useCallback((date: Date) => {
    if (isBefore(date, today)) return true;
    return unavailableDates.has(format(date, "yyyy-MM-dd"));
  }, [unavailableDates, today]);

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);
    setTooShort(false);

    if (!newRange?.from) {
      onRangeChange(null);
      return;
    }

    const checkInDate = format(newRange.from, "yyyy-MM-dd");
    const dateMinStay = minStayMap[checkInDate] ?? minStay;
    setEffectiveMin(dateMinStay);

    if (!newRange.to) {
      onRangeChange(null, checkInDate);
      return;
    }

    const validation = validateStaySelection({
      checkInDate,
      checkOutDate: format(newRange.to, "yyyy-MM-dd"),
      calendarDays,
      minStay,
      minStayMap,
    });

    if (!validation.valid) {
      setTooShort(validation.reason === "minimum-stay");
      if (validation.reason === "unavailable") setRange(undefined);
      onRangeChange(null, checkInDate);
      return;
    }

    onRangeChange(validation.selection, checkInDate);
  };

  const selectedNights = range?.from && range?.to
    ? differenceInCalendarDays(range.to, range.from)
    : 0;

  return (
    <div className="rdp-wrapper">
      <style>{`
        .rdp-wrapper .rdp-root {
          --rdp-accent-color: var(--color-primary);
          --rdp-accent-background-color: color-mix(in oklch, var(--color-primary) 15%, transparent);
          font-family: var(--font-body);
          font-size: 0.875rem;
        }
        .rdp-wrapper .rdp-day_button { border-radius: 0.375rem; }
        .rdp-wrapper .rdp-selected .rdp-day_button { background-color: var(--color-primary); color: white; }
        .rdp-wrapper .rdp-range_middle .rdp-day_button {
          background-color: color-mix(in oklch, var(--color-primary) 15%, transparent);
          color: var(--color-foreground);
          border-radius: 0;
        }
        .rdp-wrapper .rdp-disabled .rdp-day_button {
          opacity: 0.3;
          text-decoration: line-through;
          cursor: not-allowed;
        }
      `}</style>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        disabled={isDateDisabled}
        numberOfMonths={1}
        fromDate={today}
        showOutsideDays={false}
      />
      {tooShort && range?.from && range?.to && (
        <div className="mt-2 text-xs text-destructive text-center font-medium">
          Minimum stay is {effectiveMin} nights — please select a longer stay
        </div>
      )}
      {!tooShort && range?.from && range?.to && selectedNights >= effectiveMin && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          {format(range.from, "MMM d")} → {format(range.to, "MMM d, yyyy")} &nbsp;·&nbsp; {selectedNights} nights
        </div>
      )}
      {range?.from && !range?.to && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          Select your check-out date{effectiveMin > 1 ? ` (${effectiveMin}-night minimum)` : ""}
        </div>
      )}
    </div>
  );
}
