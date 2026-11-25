import { createHmac } from "node:crypto";
import { z } from "zod";

export const cancellationRequestInput = z.object({
  requestKey: z.string().uuid(),
  reservationReference: z.string().trim().min(1).max(128),
  bookingEmail: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(32).optional(),
  reason: z.string().trim().min(1).max(2000),
  acknowledged: z.literal(true),
});
export type CancellationRequestInput = z.infer<typeof cancellationRequestInput>;
export const CANCELLATION_REQUEST_RECEIPT = Object.freeze({
  received: true,
  message: "Request received for owner review. This receipt does not confirm a matching reservation, verify your identity, cancel a reservation, or guarantee a refund. Your reservation remains active until the host confirms cancellation. If you do not hear back, contact Rose City Stays at (903) 714-4305.",
});
export const RATE_WINDOW_MS = 60 * 60 * 1000;
export function requestHash(secret: string, value: string) {
  if (!secret) throw new Error("Request security configuration is unavailable");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function prepareRequest(input: CancellationRequestInput, ip: string, secret: string, now: number) {
  const window = Math.floor(now / RATE_WINDOW_MS);
  const bucket = (kind: string, value: string, limit: number) => ({
    key: requestHash(secret, `limit:${kind}:${window}:${value}`), limit,
    expiresAt: (window + 1) * RATE_WINDOW_MS,
  });
  return {
    requestKey: input.requestKey,
    requestHash: requestHash(secret, JSON.stringify([input.reservationReference, input.bookingEmail, input.phone ?? "", input.reason])),
    activeRequestKey: requestHash(secret, `active:${input.bookingEmail}:${input.reservationReference}`),
    reservationReference: input.reservationReference,
    bookingEmail: input.bookingEmail,
    phone: input.phone || null,
    reason: input.reason,
    acknowledgedAt: now,
    requestedAt: now,
    buckets: [bucket("email", input.bookingEmail, 5), bucket("ip", ip, 30)].sort((a, b) => a.key.localeCompare(b.key)),
  };
}
export interface IntakeTransaction {
  incrementBucket(bucket: { key: string; expiresAt: number }): Promise<number>;
  exists(requestKey: string, activeRequestKey: string): Promise<boolean>;
  insert(values: Omit<ReturnType<typeof prepareRequest>, "buckets">): Promise<void>;
}
/** No booking lookup: matching/nonmatching references follow exactly the same path. */
export async function receiveRequest(prepared: ReturnType<typeof prepareRequest>, tx: IntakeTransaction) {
  let throttled = false;
  for (const bucket of prepared.buckets) {
    if (await tx.incrementBucket(bucket) > bucket.limit) throttled = true;
  }
  if (throttled) return { throttled: true as const };
  if (!await tx.exists(prepared.requestKey, prepared.activeRequestKey)) {
    const { buckets: _buckets, ...values } = prepared;
    await tx.insert(values);
  }
  return { throttled: false as const, receipt: CANCELLATION_REQUEST_RECEIPT };
}
