import { describe, expect, it } from "vitest";
import { isHostawayReservationCancelled } from "./hostaway-guests";

describe("isHostawayReservationCancelled", () => {
  it("recognizes Hostaway cancellation status values", () => {
    expect(isHostawayReservationCancelled({ status: "cancelled" })).toBe(true);
    expect(isHostawayReservationCancelled({ reservationStatus: "CANCELLED" })).toBe(true);
    expect(isHostawayReservationCancelled({ isCancelled: 1 })).toBe(true);
  });

  it("does not cancel active reservations", () => {
    expect(isHostawayReservationCancelled({ status: "new" })).toBe(false);
    expect(isHostawayReservationCancelled({ status: "confirmed" })).toBe(false);
  });
});
