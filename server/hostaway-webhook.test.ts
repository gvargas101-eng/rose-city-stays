import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("Hostaway guest webhook authentication", () => {
  const secret = process.env.HOSTAWAY_WEBHOOK_SECRET;
  const authorization = `Basic ${Buffer.from(`rosecitystays:${secret}`).toString("base64")}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a request authenticated with the configured webhook secret", async () => {
    expect(secret, "HOSTAWAY_WEBHOOK_SECRET must be configured").toBeTruthy();
    const response = responseMock();

    // An unsupported event exits before external API work, exercising the endpoint's real
    // authentication path without creating or altering guest data.
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "message.received" } } as any,
      response as any,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "unsupported-event" });
  });

  it("synchronizes an event with a documented numeric reservation Object ID", async () => {
    mockSyncHostawayReservationById.mockResolvedValue({ guestId: "1" });
    const response = responseMock();

    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.updated", objectId: "64756333" } } as any,
      response as any,
    );

    expect(mockSyncHostawayReservationById).toHaveBeenCalledWith("64756333");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, reservationId: "64756333" });
  });

  it("acknowledges opaque composite Object IDs without attempting an invalid reservation fetch", async () => {
    const response = responseMock();

    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.updated", objectId: "account-329647-2000-3581013747" } } as any,
      response as any,
    );

    expect(mockSyncHostawayReservationById).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, skipped: "missing-reservation-id" });
  });

  it("acknowledges a reservation that is not queryable yet so Hostaway is not disabled", async () => {
    mockSyncHostawayReservationById.mockRejectedValue(new Error("Hostaway reservation fetch failed (404)"));
    const response = responseMock();

    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.created", objectId: "64756333" } } as any,
      response as any,
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, deferred: "reservation-not-yet-available" });
  });

  it("rejects a request with an incorrect webhook secret", async () => {
    const authorization = `Basic ${Buffer.from("rosecitystays:incorrect-secret").toString("base64")}`;
    const response = responseMock();
    await hostawayReservationWebhookHandler(
      { headers: { authorization }, body: { event: "reservation.created", objectId: "1" } } as any,
      response as any,
    );
    expect(response.statusCode).toBe(401);
  });
});
