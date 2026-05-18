/**
 * Hostaway reservation creation helper
 * Called after successful Stripe payment to block the calendar
 */

import { getAccessToken } from "./hostaway-auth";

const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";

export interface CreateReservationInput {
  hostawayListingId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  adults: number;
  totalPrice: number;
  message?: string;
  stripePaymentIntentId: string;
}

export interface HostawayReservation {
  id: string;
  status: string;
}

export async function createHostawayReservation(
  input: CreateReservationInput
): Promise<HostawayReservation> {
  const token = await getAccessToken();

  const payload = {
    listingMapId: input.hostawayListingId,
    channelId: 2000, // 2000 = Direct booking channel in Hostaway
    source: "direct",
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone || "",
    arrivalDate: input.checkIn,
    departureDate: input.checkOut,
    numberOfGuests: input.adults,
    adults: input.adults,
    totalPrice: input.totalPrice,
    isPaid: 1,
    paymentMethod: "credit_card",
    guestNote: input.message || "",
    externalBookingId: input.stripePaymentIntentId,
  };

  const res = await fetch(`${HOSTAWAY_API_BASE}/reservations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-control": "no-cache",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Hostaway reservation creation failed: ${res.status} — ${errorText}`);
  }

  const data = await res.json();
  const reservation = data.result || data;

  return {
    id: String(reservation.id || reservation.reservationId || ""),
    status: reservation.status || "confirmed",
  };
}
