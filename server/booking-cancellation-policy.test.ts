import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attachManualCancellationPolicy, buildCancellationPolicySnapshot, captureNewCancellationPolicy, getStoredCancellationPolicy, markStoredCancellationPolicyAccepted } from "./booking-cancellation-policy";
import { FUTURE_DIRECT_CANCELLATION_POLICY_ID, FUTURE_DIRECT_CANCELLATION_POLICY_TEXT } from "../shared/cancellationPolicy";
import { properties } from "../client/src/lib/properties";

describe("future booking cancellation policy snapshots", () => {
  it("records the selected 14/7 nightly-only policy and server acceptance timestamp", () => {
    const result = buildCancellationPolicySnapshot({ bookingId: 123, recordedAt: 2000, accepted: true });
    expect(result).toMatchObject({ bookingId: 123, manualLinkId: null, policyId: FUTURE_DIRECT_CANCELLATION_POLICY_ID, acceptedAt: 2000, recordedAt: 2000 });
    expect(result.policyText).toBe(FUTURE_DIRECT_CANCELLATION_POLICY_TEXT);
    expect(result.policyText).toContain("Cleaning fees and taxes are non-refundable");
  });
  it("does not falsely claim owner-created or bypassed reservations were accepted by guests", () => {
    expect(buildCancellationPolicySnapshot({ bookingId: 124, recordedAt: 2000, accepted: false }).acceptedAt).toBeNull();
  });
  it("captures a new manual checkout policy before there is a paid booking", () => {
    expect(buildCancellationPolicySnapshot({ manualLinkId: 125, recordedAt: 2000, accepted: true })).toMatchObject({ bookingId: null, manualLinkId: 125 });
  });
  it("preserves custom property terms as a distinct immutable version", () => {
    const a = buildCancellationPolicySnapshot({ bookingId: 1, policyText: "Original negotiated policy", recordedAt: 2000, accepted: false });
    const b = buildCancellationPolicySnapshot({ bookingId: 2, policyText: "Different policy", recordedAt: 2000, accepted: false });
    expect(a.policyText).toBe("Original negotiated policy");
    expect(a.policyId).not.toBe(b.policyId);
  });
  it("requires a new booking or checkout identity rather than a blanket historical backfill", () => {
    expect(() => buildCancellationPolicySnapshot({ recordedAt: 2000, accepted: false })).toThrow();
  });
  it("aligns static fallbacks with selected terms and links cancellation requests from the Terms page", () => {
    for (const property of properties) {
      if (property.cancellationPolicy) expect(property.cancellationPolicy).toBe(FUTURE_DIRECT_CANCELLATION_POLICY_TEXT);
    }
    const terms = readFileSync(new URL("../client/src/pages/TermsAndConditions.tsx", import.meta.url), "utf8");
    expect(terms).toContain("/request-cancellation");
    expect(terms).toContain("not applied retroactively");
    expect(terms).toContain("reservation remains active");
  });
});

function policyDatabase() {
  const rows: any[] = [];
  let currentText = "Original property policy";
  let writes = 0;
  const db: any = {
    select: () => ({ from: (table: any) => ({ where: () => ({ limit: async () => table.policyText ? rows : [{ cancellationPolicy: currentText }] }) }) }),
    insert: () => ({ values: (values: any) => ({ onDuplicateKeyUpdate: async () => { if (!rows.length) { rows.push({ id: 1, ...values }); writes++; } } }) }),
    update: () => ({ set: (values: any) => ({ where: async () => { for (const row of rows) Object.assign(row, values); } }) }),
  };
  return { db, rows, writes: () => writes, changeText: (value: string) => { currentText = value; } };
}

describe("immutable policy persistence", () => {
  it("preserves the first policy and timestamp across later editable property-policy changes", async () => {
    const fixture = policyDatabase();
    const original = await captureNewCancellationPolicy(fixture.db, { bookingId: 1, propertySlug: "the-briar", accepted: true });
    fixture.changeText("A later policy must not replace the original");
    const retry = await captureNewCancellationPolicy(fixture.db, { bookingId: 1, propertySlug: "the-briar", accepted: true });
    expect(retry.policyText).toBe("Original property policy");
    expect(retry.recordedAt).toBe(original.recordedAt);
    expect(fixture.writes()).toBe(1);
  });
  it("can record real later acceptance without changing frozen text or assigning legacy agreements", async () => {
    const fixture = policyDatabase();
    await captureNewCancellationPolicy(fixture.db, { manualLinkId: 2, propertySlug: "the-briar", accepted: false });
    expect(fixture.rows[0].acceptedAt).toBeNull();
    fixture.changeText("New current policy");
    await captureNewCancellationPolicy(fixture.db, { manualLinkId: 2, propertySlug: "the-briar", accepted: true });
    expect(fixture.rows[0].acceptedAt).toEqual(expect.any(Number));
    expect(fixture.rows[0].policyText).toBe("Original property policy");
  });
  it("attaches an existing prepayment manual snapshot without rewriting the policy", async () => {
    const fixture = policyDatabase();
    await captureNewCancellationPolicy(fixture.db, { manualLinkId: 2, propertySlug: "the-briar", accepted: true });
    const original = { ...fixture.rows[0] };
    await attachManualCancellationPolicy(fixture.db, 2, 3);
    expect(fixture.rows[0]).toEqual({ ...original, bookingId: 3 });
  });
  it("keeps missing legacy policy snapshots unknown when read or acknowledged", async () => {
    const fixture = policyDatabase();
    expect(await getStoredCancellationPolicy(fixture.db, 99)).toBeNull();
    await markStoredCancellationPolicyAccepted(fixture.db, 99);
    await attachManualCancellationPolicy(fixture.db, 88, 99);
    expect(fixture.rows).toEqual([]);
    expect(fixture.writes()).toBe(0);
  });
});
