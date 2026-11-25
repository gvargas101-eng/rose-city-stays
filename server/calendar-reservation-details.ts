import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { bookings } from "../drizzle/schema";
import { isHostawayReservationCancelled } from "../shared/bookingCancellation";
import { adminProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { getAccessToken } from "./hostaway-auth";
import { PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";

const inputSchema = z.object({
  reservationId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  propertySlug: z.string().trim().min(1).max(128),
});
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
function text(value: unknown, maxLength = 320): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}
function amount(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function addons(snapshot: string | null): { label: string; amount: number }[] {
  try {
    const value: unknown = JSON.parse(snapshot ?? "null");
    if (!Array.isArray(value)) return [];
    return value.slice(0, 50).flatMap(item => {
      const label = text(item?.name, 128);
      const price = amount(item?.price);
      return label && price !== null ? [{ label, amount: price }] : [];
    });
  } catch { return []; }
}

/** Only exact reservation/property links are usable; never match by guest name or dates. */
export async function readMatchingCalendarBooking(reservationId: number, propertySlug: string, listingId: number) {
  try {
    const db = await getDb();
    if (!db) return { state: "unavailable" as const, booking: null };
    // Explicit projection excludes card/payment identifiers, guest ID uploads and internal notes.
    const rows = await db.select({
      id: bookings.id, hostawayReservationId: bookings.hostawayReservationId,
      propertyId: bookings.propertyId, hostawayListingId: bookings.hostawayListingId,
      guestEmail: bookings.guestEmail, guestPhone: bookings.guestPhone,
      status: bookings.status, bookingSource: bookings.bookingSource,
      subtotal: bookings.subtotal, cleaningFee: bookings.cleaningFee, taxAmount: bookings.taxAmount,
      totalAmount: bookings.totalAmount, paidAmount: bookings.paidAmount,
      discountCodeLabel: bookings.discountCodeLabel, discountCodeAmount: bookings.discountCodeAmount,
      addonsSnapshot: bookings.addonsSnapshot,
    }).from(bookings).where(and(
      eq(bookings.hostawayReservationId, String(reservationId)),
      eq(bookings.propertyId, propertySlug), eq(bookings.hostawayListingId, listingId),
    )).limit(2);
    // Defense in depth against ambiguous links and an accidental unscoped database query.
    const matching = rows.filter(row => row.hostawayReservationId === String(reservationId)
      && row.propertyId === propertySlug && row.hostawayListingId === listingId);
    if (matching.length !== 1) return { state: matching.length ? "ambiguous" as const : "not_found" as const, booking: null };
    const row = matching[0];
    const discount = amount(row.discountCodeAmount);
    const items = [
      { label: "Accommodation", amount: amount(row.subtotal) },
      { label: "Cleaning fee", amount: amount(row.cleaningFee) },
      { label: "Tax", amount: amount(row.taxAmount) },
      ...addons(row.addonsSnapshot),
      ...(discount !== null && discount > 0 ? [{ label: text(row.discountCodeLabel, 128) ?? "Discount", amount: -discount }] : []),
    ].filter((item): item is { label: string; amount: number } => item.amount !== null);
    const total = amount(row.totalAmount);
    // Confirmed is a reservation state, NOT proof that money was received.
    const received = amount(row.paidAmount) ?? (row.bookingSource === "owner" ? 0 : null);
    const balance = total !== null && received !== null ? Math.max(0, Math.round((total - received) * 100) / 100) : null;
    const paymentState = total === 0 ? "Complimentary" : balance === null ? "Not independently verified"
      : balance === 0 ? "Paid" : received && received > 0 ? "Partially paid" : "No payment recorded";
    return { state: "matched" as const, booking: {
      id: row.id, status: row.status, source: row.bookingSource,
      email: z.string().email().safeParse(row.guestEmail).success ? row.guestEmail : null,
      phone: text(row.guestPhone, 64), currency: "USD", items, total, received, balance, paymentState,
    } };
  } catch {
    // A Hostaway-only reservation can still be inspected when website storage is unavailable.
    return { state: "unavailable" as const, booking: null };
  }
}

export const getCalendarReservationDetails = adminProcedure.input(inputSchema).query(async ({ input }) => {
  const listingId = Object.prototype.hasOwnProperty.call(PROPERTY_TO_HOSTAWAY_ID, input.propertySlug)
    ? PROPERTY_TO_HOSTAWAY_ID[input.propertySlug] : undefined;
  if (!listingId) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown calendar property." });
  let raw: Record<string, unknown>;
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.hostaway.com/v1/reservations/${input.reservationId}?includeResources=0`, {
      method: "GET", headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) throw new TRPCError({ code: "NOT_FOUND", message: "This reservation is no longer available in Hostaway." });
    if (!response.ok) throw new Error("Hostaway read failed");
    const json = await response.json();
    raw = json.result ?? json;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reservation details could not be loaded from Hostaway. Please retry." });
  }
  if (!raw || String(raw.id ?? raw.reservationId ?? "") !== String(input.reservationId)
    || Number(raw.listingMapId) !== listingId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The reservation does not match this calendar property." });
  }
  const arrival = dateOnly.safeParse(raw.arrivalDate);
  const departure = dateOnly.safeParse(raw.departureDate);
  if (!arrival.success || !departure.success || departure.data <= arrival.data) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hostaway did not return valid full stay dates. Please retry." });
  }
  const website = await readMatchingCalendarBooking(input.reservationId, input.propertySlug, listingId);
  const guestEmail = text(raw.guestEmail);
  const email = guestEmail && z.string().email().safeParse(guestEmail).success ? guestEmail : null;
  const guests = amount(raw.numberOfGuests);
  const currency = text(raw.currency, 16);
  return {
    reservation: {
      id: input.reservationId, propertySlug: input.propertySlug,
      guestName: text(raw.guestName, 256) ?? "Guest",
      channelName: text(raw.channelName, 128) ?? text(raw.source, 128) ?? "Not provided",
      status: isHostawayReservationCancelled(raw) ? "cancelled" : text(raw.status, 64) ?? text(raw.reservationStatus, 64) ?? "Not provided",
      arrivalDate: arrival.data, departureDate: departure.data,
      nights: (Date.parse(`${departure.data}T00:00:00Z`) - Date.parse(`${arrival.data}T00:00:00Z`)) / 86400000,
      numberOfGuests: guests !== null && Number.isInteger(guests) && guests > 0 ? guests : null,
      email: email ?? website.booking?.email ?? null,
      phone: text(raw.phone, 64) ?? text(raw.guestPhone, 64) ?? text(raw.guestPhoneNumber, 64) ?? website.booking?.phone ?? null,
      totalPrice: amount(raw.totalPrice), currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
    },
    websiteBookingState: website.state, websiteBooking: website.booking,
  };
});
