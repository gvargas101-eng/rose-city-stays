import type { CalendarDay } from "./calendar-types";
import { isHostawayReservationCancelled } from "@shared/bookingCancellation";

export interface CalendarBookingDraft {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
}
export interface CalendarBookingSelection {
  propertySlug: string;
  checkIn: string;
  checkOut: string | null;
}
export interface CalendarReservationRange extends Record<string, unknown> {
  arrivalDate: string;
  departureDate: string;
  status?: string;
  reservationStatus?: string;
  isCancelled?: unknown;
  isCanceled?: unknown;
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function calendarStayNights(checkIn: string, checkOut: string) {
  if (!isDateOnly(checkIn) || !isDateOnly(checkOut)) return 0;
  return (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000;
}

/** A draft transfers only dates/property, never pricing, guest details or authorizations. */
export function parseCalendarBookingDraft(search: string): CalendarBookingDraft | null {
  const params = new URLSearchParams(search);
  if (params.get("source") !== "calendar") return null;
  const propertySlug = params.get("propertySlug") ?? "";
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(propertySlug)) return null;
  const nights = calendarStayNights(checkIn, checkOut);
  if (nights < 1 || nights > 366) return null;
  return { propertySlug, checkIn, checkOut };
}
export function buildCalendarBookingUrl(draft: CalendarBookingDraft) {
  const params = new URLSearchParams({ source: "calendar", ...draft });
  if (!parseCalendarBookingDraft(params.toString())) throw new Error("Choose valid check-in and check-out dates.");
  return `/admin/manual-bookings?${params.toString()}`;
}
export function isCalendarNightReserved(date: string, reservations: CalendarReservationRange[]) {
  return reservations.some(reservation => !isHostawayReservationCancelled(reservation)
    && date >= reservation.arrivalDate && date < reservation.departureDate);
}
export function calendarRangeHasConflict(checkIn: string, checkOut: string, reservations: CalendarReservationRange[]) {
  return reservations.some(reservation => !isHostawayReservationCancelled(reservation)
    && checkIn < reservation.departureDate && checkOut > reservation.arrivalDate);
}

/** The second click is checkout; its night is deliberately excluded from occupancy. */
export function nextCalendarSelection(
  previous: CalendarBookingSelection | null,
  propertySlug: string,
  date: string,
  reservations: CalendarReservationRange[],
): { selection: CalendarBookingSelection | null; error: string | null } {
  if (!isDateOnly(date)) return { selection: previous, error: "Choose a valid calendar date." };
  if (previous?.propertySlug === propertySlug && !previous.checkOut && date > previous.checkIn) {
    const nights = calendarStayNights(previous.checkIn, date);
    if (nights > 366) return { selection: previous, error: "Choose a stay of 366 nights or fewer." };
    if (calendarRangeHasConflict(previous.checkIn, date, reservations)) {
      return { selection: previous, error: "This range includes an existing reservation. Choose an earlier checkout or different dates." };
    }
    return { selection: { ...previous, checkOut: date }, error: null };
  }
  if (isCalendarNightReserved(date, reservations)) {
    return { selection: previous, error: "That night already has a reservation. Choose an unoccupied check-in date." };
  }
  return { selection: { propertySlug, checkIn: date, checkOut: null }, error: null };
}

/** Fail closed on missing calendar dates, owner blocks, or minimum-stay restrictions. */
export function validateCalendarStay(draft: CalendarBookingDraft, days: CalendarDay[]) {
  const nights = calendarStayNights(draft.checkIn, draft.checkOut);
  if (nights < 1 || nights > 366) return { valid: false, reason: "Choose a stay of 1–366 nights." };
  const byDate = new Map(days.map(day => [day.date, day]));
  const required = Math.max(1, Number(byDate.get(draft.checkIn)?.minimumStay) || 1);
  if (nights < required) return { valid: false, reason: `Hostaway requires at least ${required} nights for this check-in.` };
  for (let index = 0; index < nights; index += 1) {
    const date = new Date(Date.parse(`${draft.checkIn}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
    const day = byDate.get(date);
    if (!day || day.isAvailable !== true || day.status !== "available") {
      return { valid: false, reason: "These dates include a reserved, blocked, or unverified night. Choose different dates or refresh availability." };
    }
  }
  return { valid: true, reason: null };
}
