import { describe, expect, it } from "vitest";
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
  it("accepts a request authenticated with the configured webhook secret", async () => {
    const secret = process.env.HOSTAWAY_WEBHOOK_SECRET;
    expect(secret, "HOSTAWAY_WEBHOOK_SECRET must be configured").toBeTruthy();
    const authorization = `Basic ${Buffer.from(`rosecitystays:${secret}`).toString("base64")}`;
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
