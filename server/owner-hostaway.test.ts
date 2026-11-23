import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./hostaway-auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));
import {
  createHostawayOwnerReservation,
  getHostawayOwnerPaymentState,
  recordHostawayOwnerReceipt,
} from "./hostaway-booking";
const response = (result: unknown) =>
  new Response(JSON.stringify({ result }), { status: 200 });
const input = {
  hostawayListingId: 630308,
  guestName: "Example Guest",
  guestEmail: "example@example.com",
  guestPhone: "9035551212",
  checkIn: "2027-01-10",
  checkOut: "2027-01-12",
  adults: 4,
  totalPrice: 500,
  cleaningFee: 100,
  taxAmount: 40,
  requestKey: "request-example",
};
describe("explicit owner Hostaway reservations", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("creates an unpaid direct stay with authoritative phone and no card/payment or overbooking claim", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ id: 123, status: "new" }));
    expect(await createHostawayOwnerReservation(input)).toEqual({
      id: "123",
      status: "new",
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain("forceOverbooking");
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({
      isPaid: 0,
      phone: "9035551212",
      totalPrice: 500,
      channelId: 2000,
      arrivalDate: "2027-01-10",
      departureDate: "2027-01-12",
    });
    expect(body.hostNote).toContain("RCS owner request request-example");
    expect(body.paymentMethod).toBeUndefined();
    expect(body.stripePaymentIntentId).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not invent a reservation ID or retry a rejected/uncertain creation", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ status: "new" }));
    await expect(createHostawayOwnerReservation(input)).rejects.toThrow(
      "did not return a reservation ID"
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("reuses an existing matching receipt after a timeout instead of posting money twice", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response([
          {
            id: 456,
            description: "RCS receipt external-reference",
            type: "charge",
            status: "paid",
            amount: 100,
          },
        ])
      );
    expect(
      await recordHostawayOwnerReceipt({
        reservationId: "123",
        amount: 100,
        reference: "external-reference",
        method: "external",
      })
    ).toEqual({ id: "456", status: "paid" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("records an owner-attested external receipt as offline other, never as a card charge", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 456, status: "paid" }));
    await recordHostawayOwnerReceipt({
      reservationId: "123",
      amount: 100,
      reference: "external-reference",
      method: "external",
    });
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toMatchObject({
      amount: 100,
      paymentMethod: "other",
      status: "paid",
      description: "RCS receipt external-reference",
    });
  });
  it("fails closed on an existing receipt with a conflicting amount", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        response([
          {
            id: 456,
            description: "RCS receipt external-reference",
            type: "charge",
            status: "paid",
            amount: 99,
          },
        ])
      );
    await expect(
      recordHostawayOwnerReceipt({
        reservationId: "123",
        amount: 100,
        reference: "external-reference",
        method: "external",
      })
    ).rejects.toThrow("does not match");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("detects a native scheduled collection independently from the reservation balance", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([
            {
              type: "charge",
              paymentMethod: "credit_card_online",
              status: "awaiting",
            },
          ])
        : response({ remainingBalance: 400, status: "new" })
    );
    expect(await getHostawayOwnerPaymentState("123")).toEqual({
      remainingBalance: 400,
      hasScheduledCollection: true,
      cancelled: false,
    });
  });
  it("does not mistake a deposit authorization for a stay-balance collection", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([
            {
              type: "preAuth",
              paymentMethod: "credit_card_online",
              status: "awaiting",
            },
          ])
        : response({ remainingBalance: 400, status: "cancelled" })
    );
    expect(await getHostawayOwnerPaymentState("123")).toEqual({
      remainingBalance: 400,
      hasScheduledCollection: false,
      cancelled: true,
    });
  });
  it("refuses an unverifiable provider balance", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ status: "new" })
    );
    await expect(getHostawayOwnerPaymentState("123")).rejects.toThrow(
      "verifiable balance"
    );
  });
});
