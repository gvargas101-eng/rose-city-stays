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

export interface HostawayPriceComponent {
  type?: string;
  name?: string;
  title?: string;
  total?: number;
  value?: number;
  isIncludedInTotalPrice?: number;
}

export interface HostawayStayQuote {
  totalPrice: number;
  components: HostawayPriceComponent[];
}

export async function quoteHostawayStay(input: {
  hostawayListingId: number;
  checkIn: string;
  checkOut: string;
  guestCount: number;
}): Promise<HostawayStayQuote> {
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
  const quote = data.result ?? data;
  const value = Number(quote.totalPrice);
  if (!Number.isFinite(value) || value < 0) throw new Error("Hostaway returned an invalid extension price");
  return {
    totalPrice: Math.round(value * 100) / 100,
    components: Array.isArray(quote.components) ? quote.components : [],
  };
}

/**
 * Computes an extension balance as the difference between Hostaway's full-stay
 * price before and after the added nights. This avoids charging cleaning fees twice.
 */
export async function quoteHostawayExtension(input: ExtensionPriceInput) {
  const [currentTotal, extendedTotal] = await Promise.all([
    quoteHostawayStay({
      hostawayListingId: input.hostawayListingId,
      checkIn: input.checkIn,
      checkOut: input.currentCheckOut,
      guestCount: input.guestCount,
    }),
    quoteHostawayStay({
      hostawayListingId: input.hostawayListingId,
      checkIn: input.checkIn,
      checkOut: input.newCheckOut,
      guestCount: input.guestCount,
    }),
  ]);
  const extensionAmount = Math.round((extendedTotal.totalPrice - currentTotal.totalPrice) * 100) / 100;
  if (extensionAmount < 0) throw new Error("Hostaway returned a negative extension balance");
  return { currentTotal: currentTotal.totalPrice, extendedTotal: extendedTotal.totalPrice, extensionAmount };
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

/** Updates dates and total for a change that remains at the same property. */
export async function updateHostawayReservationForStayChange(
  input: Omit<UpdateHostawayReservationForExtensionInput, "checkIn" | "newCheckOut"> & { newCheckIn: string; newCheckOut: string }
): Promise<void> {
  return updateHostawayReservationForExtension({
    ...input,
    checkIn: input.newCheckIn,
    newCheckOut: input.newCheckOut,
  });
}

/** Cancels a reservation only after its replacement has been created successfully. */
export async function cancelHostawayReservation(reservationId: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations/${reservationId}/statuses/cancelled`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-control": "no-cache",
    },
    body: JSON.stringify({ cancelledBy: "host" }),
  });
  if (!response.ok) {
    throw new Error(`Hostaway reservation cancellation failed: ${response.status} — ${await response.text()}`);
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

/** Explicit owner-created reservation. Never charges a card or pretends a receipt exists. */
export async function createHostawayOwnerReservation(input: Omit<CreateReservationInput, "stripePaymentIntentId"> & {
  requestKey: string; cleaningFee: number; taxAmount: number; hostNote?: string;
}): Promise<HostawayReservation> {
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations?provider=RoseCityStaysOwner`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Cache-control": "no-cache" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      listingMapId: input.hostawayListingId, channelId: 2000,
      guestName: input.guestName, guestEmail: input.guestEmail,
      phone: input.guestPhone || "", arrivalDate: input.checkIn, departureDate: input.checkOut,
      numberOfGuests: input.adults, adults: input.adults,
      totalPrice: input.totalPrice, cleaningFee: input.cleaningFee, taxAmount: input.taxAmount,
      currency: "USD", isPaid: 0,
      hostNote: `RCS owner request ${input.requestKey}\n${input.hostNote ?? ""}`,
      guestNote: input.message ?? "",
    }),
  });
  // No automatic POST retry: a timeout can occur after Hostaway has accepted the stay.
  if (!response.ok) throw new Error(`Hostaway owner reservation request failed (${response.status}). Check Hostaway before creating another request.`);
  const data = await response.json();
  const reservation = data.result ?? data;
  const id = String(reservation.id ?? "");
  if (!/^\d+$/.test(id)) throw new Error("Hostaway did not return a reservation ID. Check Hostaway before submitting another request.");
  return { id, status: String(reservation.status ?? "new") };
}

async function getOwnerReservationCharges(reservationId: string | number): Promise<any[]> {
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/guestPayments/charges?reservationId=${encodeURIComponent(String(reservationId))}&limit=500`, {
    headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Unable to verify Hostaway payments. No website collection was started.");
  const data = await response.json();
  if (!Array.isArray(data.result) || data.result.length >= 500) throw new Error("Hostaway charge history could not be verified safely.");
  return data.result;
}

/** The website refuses simultaneous collection through Hostaway and a website balance link. */
export async function getHostawayOwnerPaymentState(reservationId: string) {
  const token = await getAccessToken();
  const [response, charges] = await Promise.all([
    fetch(`${HOSTAWAY_API_BASE}/reservations/${encodeURIComponent(reservationId)}`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" }, signal: AbortSignal.timeout(15000),
    }), getOwnerReservationCharges(reservationId),
  ]);
  if (!response.ok) throw new Error("Unable to verify the current Hostaway reservation balance.");
  const data = await response.json();
  const reservation = data.result ?? data;
  if (reservation.remainingBalance == null || !Number.isFinite(Number(reservation.remainingBalance))) {
    throw new Error("Hostaway has not provided a verifiable balance. Use Hostaway to review payment before sharing a website link.");
  }
  const cancelled = ["cancelled", "canceled"].includes(String(reservation.status).toLowerCase()) || reservation.isCancelled === 1 || reservation.isCanceled === 1;
  const hasScheduledCollection = charges.some(charge => charge.type === "charge"
    && ["credit_card_online", "payment_link"].includes(charge.paymentMethod)
    && ["awaiting", "waitingForConfirmation", "pending", "processing", "pause"].includes(charge.status));
  return { remainingBalance: Math.round(Number(reservation.remainingBalance) * 100) / 100, hasScheduledCollection, cancelled };
}

/** Records funds already received; this endpoint does not initiate a payment. */
export async function recordHostawayOwnerReceipt(input: {
  reservationId: string | number; amount: number; reference: string; method: "stripe" | "external";
}): Promise<{ id: string; status: string }> {
  const marker = `RCS receipt ${input.reference}`;
  const charges = await getOwnerReservationCharges(input.reservationId);
  const matching = charges.filter(charge => charge.description === marker && charge.type === "charge");
  if (matching.length > 1) throw new Error("Multiple Hostaway receipts use the same reference. Review them before retrying.");
  if (matching.length === 1) {
    const charge = matching[0];
    if (charge.status !== "paid" || Math.round(Number(charge.amount) * 100) !== Math.round(input.amount * 100)) {
      throw new Error("An existing Hostaway receipt does not match this payment.");
    }
    return { id: String(charge.id), status: String(charge.status) };
  }
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/guestPayments/charges/${input.reservationId}`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Cache-control": "no-cache" },
    body: JSON.stringify({
      title: input.method === "stripe" ? "Website balance payment (Stripe)" : "Payment received externally by owner",
      description: marker, amount: Math.round(input.amount * 100) / 100,
      paymentMethod: input.method === "stripe" ? "credit_card" : "other", status: "paid",
      scheduledDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    }),
  });
  if (!response.ok) throw new Error(`Hostaway receipt synchronization failed (${response.status}). Actual received funds remain recorded on the website.`);
  const data = await response.json();
  const charge = data.result ?? data;
  if (!charge.id || charge.status !== "paid") throw new Error("Hostaway did not confirm the offline receipt.");
  return { id: String(charge.id), status: String(charge.status) };
}

/** Recovery is read-only: never resend a reservation POST after an uncertain outcome. */
export async function findHostawayOwnerReservation(input: {
  requestKey: string; hostawayListingId: number; guestEmail: string; checkIn: string; checkOut: string;
}): Promise<HostawayReservation | null> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ listingId: String(input.hostawayListingId), guestEmail: input.guestEmail,
    arrivalStartDate: input.checkIn, arrivalEndDate: input.checkIn, limit: "100" });
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Hostaway could not be checked for the original request. No reservation request was repeated.");
  const data = await response.json();
  if (!Array.isArray(data.result) || data.result.length >= 100) throw new Error("Hostaway recovery results cannot be verified safely.");
  const marker = `RCS owner request ${input.requestKey}`;
  const matching = data.result.filter((row: any) => String(row.hostNote ?? "").split(/\r?\n/).includes(marker)
    && Number(row.listingMapId) === input.hostawayListingId && String(row.arrivalDate).slice(0, 10) === input.checkIn
    && String(row.departureDate).slice(0, 10) === input.checkOut && String(row.guestEmail).toLowerCase() === input.guestEmail.toLowerCase());
  if (matching.length > 1) throw new Error("Multiple reservations match the creation request; review Hostaway before making changes.");
  if (!matching.length) return null;
  return { id: String(matching[0].id), status: String(matching[0].status) };
}
