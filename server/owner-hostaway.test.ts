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
  it("requests the documented payment-inclusive reservation read without mutating Hostaway", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ remainingBalance: 400, status: "new" })
    );
    await getHostawayOwnerPaymentState("123");
    expect(fetch).toHaveBeenCalledTimes(2);
    const reservationRead = fetch.mock.calls.find(
      ([url]) => new URL(String(url)).pathname === "/v1/reservations/123"
    );
    expect(reservationRead).toBeDefined();
    expect(new URL(String(reservationRead![0])).searchParams.get("includePayments")).toBe("1");
    for (const [, options] of fetch.mock.calls) {
      expect(options?.method ?? "GET").toBe("GET");
      expect(options?.body).toBeUndefined();
    }
  });
  it.each([
    { label: "known numeric zero", balance: 0, expected: 0 },
    { label: "numeric-string zero", balance: "0", expected: 0 },
    { label: "positive numeric string", balance: "400.25", expected: 400.25 },
  ])("accepts a $label balance without requiring a returned reservation ID", async ({ balance, expected }) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ remainingBalance: balance, status: "new" })
    );
    expect(await getHostawayOwnerPaymentState("123")).toEqual({
      remainingBalance: expected,
      hasScheduledCollection: false,
      cancelled: false,
    });
  });
  it.each([123, "123"])("accepts a matching optional returned reservation ID %s", async id => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ id, remainingBalance: 400, status: "new" })
    );
    expect(await getHostawayOwnerPaymentState("123")).toEqual({
      remainingBalance: 400,
      hasScheduledCollection: false,
      cancelled: false,
    });
  });
  it("rejects a balance returned for a different reservation", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ id: 456, remainingBalance: 400, status: "new" })
    );
    await expect(getHostawayOwnerPaymentState("123")).rejects.toThrow();
    for (const [, options] of fetch.mock.calls) {
      expect(options?.method ?? "GET").toBe("GET");
      expect(options?.body).toBeUndefined();
    }
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
  it.each(["cancelled", "canceled"])("preserves %s status for a known zero balance", async status => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ remainingBalance: 0, status })
    );
    expect(await getHostawayOwnerPaymentState("123")).toEqual({
      remainingBalance: 0,
      hasScheduledCollection: false,
      cancelled: true,
    });
  });
  it.each([
    { label: "missing", balance: undefined },
    { label: "null", balance: null },
    { label: "empty string", balance: "" },
    { label: "whitespace-only string", balance: " \t\n " },
    { label: "false", balance: false },
    { label: "true", balance: true },
    { label: "object", balance: {} },
    { label: "empty array", balance: [] },
    { label: "numeric array", balance: [400] },
    { label: "NaN number", balance: Number.NaN },
    { label: "positive infinity number", balance: Number.POSITIVE_INFINITY },
    { label: "negative infinity number", balance: Number.NEGATIVE_INFINITY },
    { label: "NaN string", balance: "NaN" },
    { label: "infinity string", balance: "Infinity" },
    { label: "nonnumeric string", balance: "unknown" },
    { label: "negative number", balance: -1 },
    { label: "negative numeric string", balance: "-1" },
  ])("refuses an unverifiable $label provider balance rather than inferring an amount", async ({ balance }) => {
    const reservation = { remainingBalance: balance, status: "new", totalPrice: 500 };
    const reservationResponse = response(reservation);
    // Preserve nonfinite numbers: JSON.stringify would otherwise turn them into null.
    vi.spyOn(reservationResponse, "json").mockResolvedValue({ result: reservation });
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?") ? response([]) : reservationResponse
    );
    await expect(getHostawayOwnerPaymentState("123")).rejects.toThrow("verifiable balance");
    for (const [, options] of fetch.mock.calls) {
      expect(options?.method ?? "GET").toBe("GET");
      expect(options?.body).toBeUndefined();
    }
  });
  it("does not treat a cancelled reservation's unknown balance as zero", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async url =>
      String(url).includes("/charges?")
        ? response([])
        : response({ remainingBalance: null, status: "cancelled" })
    );
    await expect(getHostawayOwnerPaymentState("123")).rejects.toThrow("verifiable balance");
  });
});
