import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./hostaway-auth", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));
import { getListingReservations } from "./hostaway";
afterEach(() => vi.unstubAllGlobals());

describe("Hostaway master-calendar reservation cancellation projection", () => {
  it("keeps cancellation flags when projecting the reduced calendar fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [
      { id: 1, listingMapId: 329641, status: "confirmed", isCanceled: "true" },
      { id: 2, listingMapId: 329641, status: "canceled" },
      { id: 3, listingMapId: 329641, reservationStatus: "CANCELLED" },
      { id: 4, listingMapId: 329641, status: "confirmed", isCancelled: "0" },
      { id: 5, listingMapId: 630308, status: "confirmed" },
    ] }) }));
    const rows = await getListingReservations(329641, "2027-01-01", "2027-01-31");
    expect(rows.map(row => row.status)).toEqual(["cancelled", "cancelled", "cancelled", "confirmed"]);
    expect(rows.map(row => row.id)).toEqual([1, 2, 3, 4]);
  });
});
