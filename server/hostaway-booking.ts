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

export interface RecordHostawayPaymentInput {
  reservationId: string | number;
  amount: number;
  stripePaymentIntentId: string;
}

export interface ExtensionPriceInput {
  hostawayListingId: number;
  checkIn: string;
  currentCheckOut: string;
  newCheckOut: string;
  guestCount: number;
}

export interface UpdateHostawayReservationForExtensionInput {
  reservationId: string;
  hostawayListingId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  guestCount: number;
  checkIn: string;
  newCheckOut: string;
  totalPrice: number;
}

async function calculateHostawayReservationPrice(input: {
  hostawayListingId: number;
  checkIn: string;
  checkOut: string;
  guestCount: number;
}): Promise<number> {
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/listings/${input.hostawayListingId}/calendar/priceDetails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-control": "no-cache",
    },
    body: JSON.stringify({
      startingDate: input.checkIn,
      endingDate: input.checkOut,
      numberOfGuests: input.guestCount,
      version: 2,
    }),
  });
  if (!response.ok) {
    throw new Error(`Hostaway extension price calculation failed: ${response.status} — ${await response.text()}`);
  }
  const data = await response.json();
  const value = Number((data.result ?? data).totalPrice);
  if (!Number.isFinite(value) || value < 0) throw new Error("Hostaway returned an invalid extension price");
  return Math.round(value * 100) / 100;
}

/**
 * Computes an extension balance as the difference between Hostaway's full-stay
 * price before and after the added nights. This avoids charging cleaning fees twice.
 */
export async function quoteHostawayExtension(input: ExtensionPriceInput) {
  const [currentTotal, extendedTotal] = await Promise.all([
    calculateHostawayReservationPrice({
      hostawayListingId: input.hostawayListingId,
      checkIn: input.checkIn,
      checkOut: input.currentCheckOut,
      guestCount: input.guestCount,
    }),
    calculateHostawayReservationPrice({
      hostawayListingId: input.hostawayListingId,
      checkIn: input.checkIn,
      checkOut: input.newCheckOut,
      guestCount: input.guestCount,
    }),
  ]);
  const extensionAmount = Math.round((extendedTotal - currentTotal) * 100) / 100;
  if (extensionAmount < 0) throw new Error("Hostaway returned a negative extension balance");
  return { currentTotal, extendedTotal, extensionAmount };
}

/** Updates only the supported reservation fields needed for a paid stay extension. */
export async function updateHostawayReservationForExtension(
  input: UpdateHostawayReservationForExtensionInput
): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations/${input.reservationId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-control": "no-cache",
    },
    body: JSON.stringify({
      listingMapId: input.hostawayListingId,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      phone: input.guestPhone ?? "",
      guestPhone: input.guestPhone ?? "",
      numberOfGuests: input.guestCount,
      adults: input.guestCount,
      arrivalDate: input.checkIn,
      departureDate: input.newCheckOut,
      totalPrice: input.totalPrice,
    }),
  });
  if (!response.ok) {
    throw new Error(`Hostaway reservation extension failed: ${response.status} — ${await response.text()}`);
  }
}

/**
 * Hostaway API reservations do not become "Paid" from an isPaid flag on the
 * reservation payload. Record the Stripe-collected amount as a paid offline
 * charge so the PMS balance and guest payment status reconcile correctly.
 */
export async function recordHostawayStripePayment(
  input: RecordHostawayPaymentInput
): Promise<{ id: string; status: string }> {
  const token = await getAccessToken();
  const scheduledDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const response = await fetch(
    `${HOSTAWAY_API_BASE}/guestPayments/charges/${input.reservationId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-control": "no-cache",
      },
      body: JSON.stringify({
        title: "Direct website payment (Stripe)",
        description: `Collected by Rose City Stays Stripe Checkout — PaymentIntent ${input.stripePaymentIntentId}`,
        amount: Math.round(input.amount * 100) / 100,
        paymentMethod: "credit_card",
        status: "paid",
        scheduledDate,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hostaway payment reconciliation failed: ${response.status} — ${await response.text()}`);
  }

  const data = await response.json();
  const charge = data.result ?? data;
  return { id: String(charge.id ?? ""), status: String(charge.status ?? "paid") };
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
