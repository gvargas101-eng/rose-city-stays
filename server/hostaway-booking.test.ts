import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hostaway-auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("hostaway-test-token"),
}));

import { recordHostawayStripePayment } from "./hostaway-booking";

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
