import { createHash } from "node:crypto";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { bookingCancellationPolicies, properties } from "../drizzle/schema";
import { FUTURE_DIRECT_CANCELLATION_POLICY_ID, FUTURE_DIRECT_CANCELLATION_POLICY_TEXT } from "../shared/cancellationPolicy";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function buildCancellationPolicySnapshot(params: {
  bookingId?: number;
  manualLinkId?: number;
  policyText?: string | null;
  recordedAt: number;
  accepted: boolean;
}) {
  if (!params.bookingId && !params.manualLinkId) throw new Error("A new booking or checkout link is required for a policy snapshot");
  const policyText = params.policyText?.trim() || FUTURE_DIRECT_CANCELLATION_POLICY_TEXT;
  return {
    bookingId: params.bookingId ?? null,
    manualLinkId: params.manualLinkId ?? null,
    policyId: policyText === FUTURE_DIRECT_CANCELLATION_POLICY_TEXT
      ? FUTURE_DIRECT_CANCELLATION_POLICY_ID
      : `property-${createHash("sha256").update(policyText).digest("hex")}`,
    policyText,
    recordedAt: params.recordedAt,
    acceptedAt: params.accepted ? params.recordedAt : null,
  };
}

/** Invoke only while creating a NEW booking/link, never on existing-booking retries. */
export async function captureNewCancellationPolicy(db: Database, params: {
  bookingId?: number;
  manualLinkId?: number;
  propertySlug: string;
  accepted: boolean;
}) {
  const predicates = [
    ...(params.bookingId ? [eq(bookingCancellationPolicies.bookingId, params.bookingId)] : []),
    ...(params.manualLinkId ? [eq(bookingCancellationPolicies.manualLinkId, params.manualLinkId)] : []),
  ];
  if (!predicates.length) throw new Error("New policy snapshot requires an identifier");
  const [existing] = await db.select().from(bookingCancellationPolicies).where(or(...predicates)).limit(1);
  if (existing) {
    if (params.accepted && existing.acceptedAt === null) {
      await markStoredCancellationPolicyAccepted(db, params.bookingId, params.manualLinkId);
      const [accepted] = await db.select().from(bookingCancellationPolicies).where(or(...predicates)).limit(1);
      return accepted ?? existing;
    }
    return existing;
  }
  const [property] = await db.select({ cancellationPolicy: properties.cancellationPolicy }).from(properties)
    .where(eq(properties.slug, params.propertySlug)).limit(1);
  if (!property) throw new Error("Property policy is unavailable");
  const values = buildCancellationPolicySnapshot({ ...params, policyText: property.cancellationPolicy, recordedAt: Date.now() });
  await db.insert(bookingCancellationPolicies).values(values).onDuplicateKeyUpdate({ set: { id: sql`${bookingCancellationPolicies.id}` } });
  const [stored] = await db.select().from(bookingCancellationPolicies).where(or(...predicates)).limit(1);
  if (!stored) throw new Error("Could not preserve the booking cancellation policy");
  return stored;
}

/** Promote a snapshot saved before manual payment; never substitute today's policy for a legacy stay. */
export async function attachManualCancellationPolicy(db: Database, manualLinkId: number, bookingId: number) {
  await db.update(bookingCancellationPolicies).set({ bookingId }).where(and(
    eq(bookingCancellationPolicies.manualLinkId, manualLinkId), isNull(bookingCancellationPolicies.bookingId),
  ));
}

export async function getStoredCancellationPolicy(db: Database, bookingId?: number | null, manualLinkId?: number | null) {
  const predicates = [
    ...(bookingId ? [eq(bookingCancellationPolicies.bookingId, bookingId)] : []),
    ...(manualLinkId ? [eq(bookingCancellationPolicies.manualLinkId, manualLinkId)] : []),
  ];
  if (!predicates.length) return null;
  const [stored] = await db.select({ policyId: bookingCancellationPolicies.policyId, policyText: bookingCancellationPolicies.policyText })
    .from(bookingCancellationPolicies).where(or(...predicates)).limit(1);
  return stored ?? null;
}

/** Record real acknowledgment only if an original snapshot exists; never backfill legacy terms. */
export async function markStoredCancellationPolicyAccepted(db: Database, bookingId?: number, manualLinkId?: number) {
  const predicates = [
    ...(bookingId ? [eq(bookingCancellationPolicies.bookingId, bookingId)] : []),
    ...(manualLinkId ? [eq(bookingCancellationPolicies.manualLinkId, manualLinkId)] : []),
  ];
  if (!predicates.length) return;
  await db.update(bookingCancellationPolicies).set({ acceptedAt: Date.now() })
    .where(and(or(...predicates), isNull(bookingCancellationPolicies.acceptedAt)));
}
