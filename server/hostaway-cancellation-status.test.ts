import { describe, expect, it } from "vitest";
import { isHostawayReservationCancelled } from "./hostaway-guests";
import { getManualBookingStatus } from "../shared/bookingCancellation";

describe("isHostawayReservationCancelled", () => {
  it.each([
    { status: "cancelled" }, { status: "canceled" }, { status: " CANCELED " },
    { reservationStatus: "CANCELLED" }, { status: "new", reservationStatus: "canceled" },
    { isCancelled: true }, { isCancelled: 1 }, { isCancelled: "1" },
    { isCancelled: " TRUE " }, { isCanceled: true }, { isCanceled: "true" },
  ])("recognizes cancellation signal %j", reservation => {
    expect(isHostawayReservationCancelled(reservation)).toBe(true);
  });

  it.each([
    {}, { status: "new" }, { status: "confirmed" }, { status: "pending" },
    { isCancelled: false }, { isCancelled: 0 }, { isCancelled: "0" },
    { isCancelled: "false" }, { status: "cancellation_requested" }, { status: "not cancelled" },
  ])("does not cancel active/unknown reservations %j", reservation => {
    expect(isHostawayReservationCancelled(reservation)).toBe(false);
  });
});

describe("manual booking reservation state (separate from payment/link lifecycle)", () => {
  const bookings = [
    { id: 1, hostawayReservationId: "101", status: "cancelled" },
    { id: 2, hostawayReservationId: "102", status: "confirmed" },
  ];
  it("projects the canonical cancellation by bookingId without modifying the paid link", () => {
    const link = { bookingId: 1, status: "paid" };
    expect(getManualBookingStatus(link, bookings, new Set())).toBe("cancelled");
    expect(link.status).toBe("paid");
  });
  it("falls back to Hostaway reservation ID for legacy links missing bookingId", () => {
    expect(getManualBookingStatus({ hostawayReservationId: "101" }, bookings, new Set())).toBe("cancelled");
  });
  it("retains legacy cancellation via a sticky marker even without a canonical booking", () => {
    expect(getManualBookingStatus({ hostawayReservationId: "900" }, [], new Set(["900"]))).toBe("cancelled");
  });
  it("makes cancellation win over an inconsistent paid/confirmed duplicate", () => {
    expect(getManualBookingStatus({ bookingId: 2, hostawayReservationId: "101" }, bookings, new Set())).toBe("cancelled");
    expect(getManualBookingStatus({ bookingId: 2, hostawayReservationId: "102" }, bookings, new Set(["102"]))).toBe("cancelled");
  });
  it("does not infer confirmed reservation state solely from paid link status", () => {
    expect(getManualBookingStatus({}, bookings, new Set())).toBeNull();
    expect(getManualBookingStatus({ bookingId: 2 }, bookings, new Set())).toBe("confirmed");
  });
});
