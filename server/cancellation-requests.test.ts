import { describe, expect, it, vi } from "vitest";
import { cancellationRequestInput, CANCELLATION_REQUEST_RECEIPT, prepareRequest, RATE_WINDOW_MS, receiveRequest, type IntakeTransaction } from "./cancellation-requests";
import { readFileSync } from "node:fs";

const input = () => cancellationRequestInput.parse({ requestKey: "d60e1c75-113e-4331-9f6e-ff6c9956ef58", reservationReference: "12345", bookingEmail: "guest@example.com", reason: "Plans changed", acknowledged: true });
function fakeTransaction() {
  const counts = new Map<string, number>();
  const rows: Array<any> = [];
  const tx: IntakeTransaction = {
    incrementBucket: vi.fn(async bucket => { const n = (counts.get(bucket.key) ?? 0) + 1; counts.set(bucket.key, n); return n; }),
    exists: vi.fn(async (key, active) => rows.some(row => row.requestKey === key || row.activeRequestKey === active)),
    insert: vi.fn(async row => { rows.push(row); }),
  };
  return { tx, rows, counts };
}

describe("unverified cancellation-request intake", () => {
  it("requires explicit acknowledgment and bounds identifying/user content", () => {
    expect(() => cancellationRequestInput.parse({ ...input(), acknowledged: false })).toThrow();
    expect(() => cancellationRequestInput.parse({ ...input(), reason: "x".repeat(2001) })).toThrow();
    expect(() => cancellationRequestInput.parse({ ...input(), reservationReference: "" })).toThrow();
    expect(cancellationRequestInput.parse({ ...input(), bookingEmail: " GUEST@example.com " }).bookingEmail).toBe("guest@example.com");
  });
  it("returns identical generic receipts for arbitrary matching or nonmatching references, with no lookup or private details", async () => {
    const one = fakeTransaction(); const two = fakeTransaction();
    const a = await receiveRequest(prepareRequest(input(), "127.0.0.1", "test-secret", 100), one.tx);
    const b = await receiveRequest(prepareRequest({ ...input(), reservationReference: "nonexistent" }, "127.0.0.1", "test-secret", 100), two.tx);
    expect(a).toEqual(b);
    expect(a).toEqual({ throttled: false, receipt: CANCELLATION_REQUEST_RECEIPT });
    expect(Object.keys(CANCELLATION_REQUEST_RECEIPT)).toEqual(["received", "message"]);
    expect(JSON.stringify(a)).not.toContain("guest@example.com");
    expect(JSON.stringify(a)).not.toContain("12345");
    expect(CANCELLATION_REQUEST_RECEIPT.message).toContain("does not confirm a matching reservation");
    expect(CANCELLATION_REQUEST_RECEIPT.message).toContain("remains active");
  });
  it("persists original request exactly once for replay or same active email/reference", async () => {
    const { tx, rows } = fakeTransaction();
    const original = prepareRequest(input(), "127.0.0.1", "test-secret", 100);
    await receiveRequest(original, tx); await receiveRequest(original, tx);
    await receiveRequest(prepareRequest({ ...input(), requestKey: "660e8400-e29b-41d4-a716-446655440000", reason: "Changed text" }, "127.0.0.1", "test-secret", 200), tx);
    expect(rows).toHaveLength(1);
    expect(rows[0].requestedAt).toBe(100);
    expect(rows[0].reason).toBe("Plans changed");
  });
  it("uses durable transaction counters for the normalized email even across IPs", async () => {
    const { tx, rows } = fakeTransaction();
    for (let n = 0; n < 5; n++) expect((await receiveRequest(prepareRequest(input(), `ip-${n}`, "test-secret", 100), tx)).throttled).toBe(false);
    expect((await receiveRequest(prepareRequest(input(), "different-ip", "test-secret", 100), tx)).throttled).toBe(true);
    expect(rows).toHaveLength(1);
  });
  it("limits shared IP across different emails and resets on the next fixed window", async () => {
    const { tx } = fakeTransaction();
    for (let n = 0; n < 30; n++) {
      const candidate = { ...input(), bookingEmail: `guest${n}@example.com` };
      expect((await receiveRequest(prepareRequest(candidate, "same-ip", "test-secret", 100), tx)).throttled).toBe(false);
    }
    const candidate = { ...input(), bookingEmail: "another@example.com" };
    expect((await receiveRequest(prepareRequest(candidate, "same-ip", "test-secret", 100), tx)).throttled).toBe(true);
    expect((await receiveRequest(prepareRequest(candidate, "same-ip", "test-secret", RATE_WINDOW_MS + 100), tx)).throttled).toBe(false);
  });
  it("stores only secret-keyed bucket hashes and fails closed without a secret", () => {
    const prepared = prepareRequest(input(), "203.0.113.10", "test-secret", 100);
    for (const bucket of prepared.buckets) expect(bucket.key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(prepared.buckets)).not.toContain("203.0.113.10");
    expect(JSON.stringify(prepared.buckets)).not.toContain("guest@example.com");
    expect(() => prepareRequest(input(), "ip", "", 100)).toThrow();
  });
  it("request modules contain no provider/payment/notification imports or booking-status writes", () => {
    for (const filename of ["server/cancellation-requests.ts", "server/routers/cancellations.ts"]) {
      const source = readFileSync(filename, "utf8");
      expect(source).not.toMatch(/from ["'][^"']*(?:hostaway|stripe|notification|booking-changes|booking-extensions)[^"']*["']/);
      expect(source).not.toMatch(/console\.(?:log|error|warn)/);
      expect(source).not.toContain("update(bookings)");
      expect(source).not.toContain("from(bookings)");
    }
  });
});
