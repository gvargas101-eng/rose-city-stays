import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSyncHostawayReservationById } = vi.hoisted(() => ({
  mockSyncHostawayReservationById: vi.fn(),
}));
vi.mock("./hostaway-guests", () => ({
  syncHostawayReservationById: mockSyncHostawayReservationById,
}));

import { hostawayReservationWebhookHandler } from "./hostaway-webhook";

function responseMock() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
}

const secret = "synthetic-test-secret";
const authorization = `Basic ${Buffer.from(`rosecitystays:${secret}`).toString("base64")}`;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("HOSTAWAY_WEBHOOK_SECRET", secret);
  mockSyncHostawayReservationById.mockResolvedValue({ createdGuest: false, createdReservation: false });
});
afterEach(() => vi.unstubAllEnvs());

describe("Hostaway reservation webhook", () => {
  it("acknowledges unsupported events without external work", async () => {
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "message.received" } } as any, response,
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "unsupported-event" });
    expect(mockSyncHostawayReservationById).not.toHaveBeenCalled();
  });

  it.each(["reservation.created", "reservation.updated", "reservation.cancelled", "reservation.canceled", " RESERVATION.CANCELED "])(
    "retrieves authoritative current state for %s", async event => {
      const response = responseMock();
      await hostawayReservationWebhookHandler(
        { headers: { authorization }, body: { event, objectId: "64756333", status: "cancelled" } } as any, response,
      );
      expect(mockSyncHostawayReservationById).toHaveBeenCalledTimes(1);
      expect(mockSyncHostawayReservationById).toHaveBeenCalledWith("64756333");
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ ok: true, reservationId: "64756333" });
    },
  );

  it.each([
    { reservationId: "64756333" }, { reservation: { id: 64756333 } },
    { data: { reservationId: 64756333 } }, { data: { reservation: { id: 64756333 } } },
    { data: { id: 64756333 } },
  ])("accepts numeric reservation cancellation payload %j", async payload => {
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.cancelled", ...payload } } as any, response,
    );
    expect(mockSyncHostawayReservationById).toHaveBeenCalledWith("64756333");
  });

  it("acknowledges opaque composite Object IDs without attempting an invalid reservation fetch", async () => {
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.updated", objectId: "account-329647-2000-3581013747" } } as any, response,
    );
    expect(mockSyncHostawayReservationById).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "missing-reservation-id" });
  });

  it("acknowledges a reservation that is not queryable yet so Hostaway is not disabled", async () => {
    mockSyncHostawayReservationById.mockRejectedValue(new Error("Hostaway reservation fetch failed (404)"));
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.created", objectId: "64756333" } } as any, response,
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, deferred: "reservation-not-yet-available" });
  });

  it("returns 500 on cancellation persistence failure for retry instead of falsely acknowledging", async () => {
    mockSyncHostawayReservationById.mockRejectedValue(new Error("Database unavailable"));
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.cancelled", objectId: "64756333" } } as any, response,
    );
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Guest sync failed" });
  });

  it.each([undefined, `Basic ${Buffer.from("rosecitystays:incorrect-secret").toString("base64")}`])("rejects missing or incorrect credentials", async authorization => {
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.cancelled", objectId: "1" } } as any, response,
    );
    expect(response.statusCode).toBe(401);
    expect(mockSyncHostawayReservationById).not.toHaveBeenCalled();
  });
});
