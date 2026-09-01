import { getAccessToken } from "../server/hostaway-auth";

const reservationId = process.argv[2];
if (!reservationId) throw new Error("Usage: tsx scripts/check-hostaway-cancellation.mts <reservationId>");

const token = await getAccessToken();
const response = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!response.ok) throw new Error(`Hostaway reservation lookup failed: ${response.status}`);

const body = await response.json() as { result?: Record<string, unknown> };
const reservation = body.result ?? {};
console.log(JSON.stringify({
  reservationId,
  status: reservation.status,
  reservationStatus: reservation.reservationStatus,
  isCancelled: reservation.isCancelled,
  cancellationDate: reservation.cancellationDate,
  updatedOn: reservation.updatedOn,
}, null, 2));
