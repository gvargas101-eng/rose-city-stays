/**
 * DateRangePicker — uses react-day-picker to let guests select check-in/check-out
 * Integrates with the live Hostaway calendar to disable booked dates
 */

import { useState, useCallback } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, differenceInCalendarDays, addDays, isBefore, startOfDay } from "date-fns";
import "react-day-picker/style.css";
import type { CalendarDay } from "@/lib/calendar-types";

interface DateRangePickerProps {
  calendarDays: CalendarDay[];
  onRangeChange: (range: { checkIn: Date; checkOut: Date; nights: number; avgNightlyRate: number } | null) => void;
  minStay?: number;
}

export default function DateRangePicker({ calendarDays, onRangeChange, minStay = 1 }: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const today = startOfDay(new Date());

  // Build a set of unavailable date strings for fast lookup
  const unavailableDates = new Set(
    calendarDays.filter(d => !d.isAvailable).map(d => d.date)
  );

  // Build a price map for available dates
  const priceMap = new Map(
    calendarDays.filter(d => d.isAvailable && d.price > 0).map(d => [d.date, d.price])
  );

  const isDateDisabled = useCallback((date: Date) => {
    if (isBefore(date, today)) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.has(dateStr);
  }, [unavailableDates, today]);

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);

    if (!newRange?.from || !newRange?.to) {
      onRangeChange(null);
      return;
    }

    const nights = differenceInCalendarDays(newRange.to, newRange.from);
    if (nights < 1) {
      onRangeChange(null);
      return;
    }

    // Check if any date in range is unavailable
    let hasUnavailable = false;
    let totalPrice = 0;
    let pricedNights = 0;

    for (let i = 0; i < nights; i++) {
      const d = addDays(newRange.from, i);
      const dateStr = format(d, "yyyy-MM-dd");
      if (unavailableDates.has(dateStr)) {
        hasUnavailable = true;
        break;
      }
      const price = priceMap.get(dateStr);
      if (price) {
        totalPrice += price;
        pricedNights++;
      }
    }

    if (hasUnavailable) {
      setRange(undefined);
      onRangeChange(null);
      return;
    }

    const avgNightlyRate = pricedNights > 0 ? Math.round(totalPrice / pricedNights) : 0;

    onRangeChange({
      checkIn: newRange.from,
      checkOut: newRange.to,
      nights,
      avgNightlyRate,
    });
  };

  return (
    <div className="rdp-wrapper">
      <style>{`
        .rdp-wrapper .rdp-root {
          --rdp-accent-color: var(--color-primary);
          --rdp-accent-background-color: color-mix(in oklch, var(--color-primary) 15%, transparent);
          font-family: var(--font-body);
          font-size: 0.875rem;
        }
        .rdp-wrapper .rdp-day_button {
          border-radius: 0.375rem;
        }
        .rdp-wrapper .rdp-selected .rdp-day_button {
          background-color: var(--color-primary);
          color: white;
        }
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
      {range?.from && range?.to && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          {format(range.from, "MMM d")} → {format(range.to, "MMM d, yyyy")} &nbsp;·&nbsp;{" "}
          {differenceInCalendarDays(range.to, range.from)} nights
        </div>
      )}
      {range?.from && !range?.to && (
        <div className="mt-2 text-sm text-muted-foreground text-center">
          Select your check-out date
        </div>
      )}
    </div>
  );
}
