import { getAccessToken } from "../server/hostaway-auth";

const reservationId = process.argv[2];
if (!reservationId) throw new Error("Usage: tsx scripts/inspect-hostaway-reservation.mts <reservation_id>");

const token = await getAccessToken();
const response = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
  headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
});

if (!response.ok) throw new Error(`Hostaway returned ${response.status}: ${await response.text()}`);
const payload = await response.json();
const reservation = payload.result ?? payload;

console.log(JSON.stringify({
  id: reservation.id ?? reservation.reservationId,
  status: reservation.status,
  reservationStatus: reservation.reservationStatus,
  paymentStatus: reservation.paymentStatus,
  isPaid: reservation.isPaid,
  channelId: reservation.channelId,
  source: reservation.source,
  listingMapId: reservation.listingMapId,
  arrivalDate: reservation.arrivalDate,
  departureDate: reservation.departureDate,
  totalPrice: reservation.totalPrice,
  externalBookingId: reservation.externalBookingId,
  cancellationPolicy: reservation.cancellationPolicy,
}, null, 2));
