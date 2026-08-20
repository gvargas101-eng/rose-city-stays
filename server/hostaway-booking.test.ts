import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hostaway-auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("hostaway-test-token"),
}));

import { quoteHostawayExtension, recordHostawayStripePayment, updateHostawayReservationForExtension } from "./hostaway-booking";

describe("recordHostawayStripePayment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("records a paid credit-card charge against the matching Hostaway reservation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { id: 32189934, status: "paid" } }), { status: 200 })
    );

    const result = await recordHostawayStripePayment({
      reservationId: "64756333",
      amount: 546.83,
      stripePaymentIntentId: "pi_live_verified",
    });

    expect(result).toEqual({ id: "32189934", status: "paid" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.hostaway.com/v1/guestPayments/charges/64756333",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      amount: 546.83,
      paymentMethod: "credit_card",
      status: "paid",
    });
  });
});

describe("Hostaway reservation extensions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("quotes only the incremental balance between the original and extended stay", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const totalPrice = body.endingDate === "2026-09-08" ? 900 : 600;
      return new Response(JSON.stringify({ result: { totalPrice } }), { status: 200 });
    });

    await expect(quoteHostawayExtension({
      hostawayListingId: 123,
      checkIn: "2026-09-01",
      currentCheckOut: "2026-09-05",
      newCheckOut: "2026-09-08",
      guestCount: 4,
    })).resolves.toEqual({ currentTotal: 600, extendedTotal: 900, extensionAmount: 300 });
  });

  it("updates Hostaway with the new checkout and quoted total without forcing overbooking", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: { id: 64756333 } }), { status: 200 })
    );
    await updateHostawayReservationForExtension({
      reservationId: "64756333",
      hostawayListingId: 123,
      guestName: "Guest Example",
      guestEmail: "guest@example.com",
      guestPhone: "5551112222",
      guestCount: 4,
      checkIn: "2026-09-01",
      newCheckOut: "2026-09-08",
      totalPrice: 900,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.hostaway.com/v1/reservations/64756333",
      expect.objectContaining({ method: "PUT" })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      departureDate: "2026-09-08",
      totalPrice: 900,
      numberOfGuests: 4,
    });
  });
});
