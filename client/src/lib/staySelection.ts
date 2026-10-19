import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { CalendarDay } from "./calendar-types";

export interface StaySelection {
  checkIn: Date;
  checkOut: Date;
  nights: number;
  avgNightlyRate: number;
}

export type StaySelectionValidation =
  | { valid: true; selection: StaySelection }
  | { valid: false; reason: "invalid-range" | "minimum-stay" | "unavailable" };

interface ValidateStaySelectionInput {
  checkInDate: string;
  checkOutDate: string;
  calendarDays: CalendarDay[];
  minStay?: number;
  minStayMap?: Record<string, number>;
}

/**
 * Validates a selected date range against the same Hostaway calendar data used
 * by both booking calendars. Checkout day is intentionally excluded from the
 * nightly-rate and availability calculation.
 */
export function validateStaySelection({
  checkInDate,
  checkOutDate,
  calendarDays,
  minStay = 1,
  minStayMap = {},
}: ValidateStaySelectionInput): StaySelectionValidation {
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);
  const nights = differenceInCalendarDays(checkOut, checkIn);

  if (nights < 1) {
    return { valid: false, reason: "invalid-range" };
  }

  const requiredNights = minStayMap[checkInDate] ?? minStay;
  if (nights < requiredNights) {
    return { valid: false, reason: "minimum-stay" };
  }

  const daysByDate = new Map(calendarDays.map((day) => [day.date, day]));
  let totalPrice = 0;
  let pricedNights = 0;

  for (let offset = 0; offset < nights; offset += 1) {
    const date = format(addDays(checkIn, offset), "yyyy-MM-dd");
    const calendarDay = daysByDate.get(date);

    if (!calendarDay?.isAvailable) {
      return { valid: false, reason: "unavailable" };
    }

    if (calendarDay.price > 0) {
      totalPrice += calendarDay.price;
      pricedNights += 1;
    }
  }

  return {
    valid: true,
    selection: {
      checkIn,
      checkOut,
      nights,
      avgNightlyRate: pricedNights > 0 ? Math.round(totalPrice / pricedNights) : 0,
    },
  };
}
