/** Cancellation is reservation state, not payment/refund or booking-link state. */
export function isHostawayReservationCancelled(reservation: Record<string, unknown>): boolean {
  const isCancelledStatus = (value: unknown) =>
    typeof value === "string" && /^(cancelled|canceled)$/.test(value.trim().toLowerCase());
  const isTrue = (value: unknown) =>
    value === true || value === 1 || (typeof value === "string" && /^(1|true)$/.test(value.trim().toLowerCase()));
  return isCancelledStatus(reservation.status) || isCancelledStatus(reservation.reservationStatus) ||
    isTrue(reservation.isCancelled) || isTrue(reservation.isCanceled);
}

/** Existing settings storage holds a minimal, sticky marker for legacy manual links
 * without a canonical booking. No guest directory tables or payment data are needed. */
export const HOSTAWAY_CANCELLATION_KEY_PREFIX = "hostaway-reservation-cancelled:";
export function hostawayCancellationKey(reservationId: string): string {
  return `${HOSTAWAY_CANCELLATION_KEY_PREFIX}${reservationId}`;
}

export function getManualBookingStatus(
  link: { bookingId?: number | null; hostawayReservationId?: string | null },
  bookingRows: readonly { id: number; hostawayReservationId?: string | null; status: string }[],
  cancelledReservationIds: ReadonlySet<string>,
): string | null {
  const linked = bookingRows.filter(booking =>
    (link.bookingId != null && booking.id === link.bookingId) ||
    (Boolean(link.hostawayReservationId) && booking.hostawayReservationId === link.hostawayReservationId));
  // Cancellation wins even if duplicate/legacy records disagree. Link paid status
  // intentionally does not imply a reservation is still confirmed.
  if ((link.hostawayReservationId && cancelledReservationIds.has(link.hostawayReservationId)) ||
    linked.some(booking => booking.status === "cancelled")) return "cancelled";
  return linked.find(booking => booking.id === link.bookingId)?.status ?? linked[0]?.status ?? null;
}
