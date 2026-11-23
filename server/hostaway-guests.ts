/**
 * Hostaway guest-directory synchronization.
 *
 * Stores only contact details and reservation history needed for host operations:
 * name, email, phone, property/channel, and stay dates. Payment details and identity
 * documents are intentionally never read or copied into the guest directory.
 */
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "./db";
import { getAccessToken } from "./hostaway-auth";
import {
  bookings,
  guestProfiles,
  guestSyncState,
  hostawayGuestReservations,
  manualBookingLinks,
  siteSettings,
} from "../drizzle/schema";
import { PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";
import { hostawayCancellationKey, isHostawayReservationCancelled } from "../shared/bookingCancellation";
export { isHostawayReservationCancelled } from "../shared/bookingCancellation";

const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";
const SYNC_KEY = "hostaway-guests";
const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = 750;

type HostawayReservation = Record<string, any>;

export type GuestSyncResult = {
  processed: number;
  createdGuests: number;
  updatedGuests: number;
  createdReservations: number;
  updatedReservations: number;
};

function normalizeEmail(email?: unknown): string | null {
  if (typeof email !== "string") return null;
  const value = email.trim().toLowerCase();
  return value.includes("@") ? value : null;
}

function normalizePhone(phone?: unknown): string | null {
  if (typeof phone !== "string" && typeof phone !== "number") return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-15) : null;
}

function dateToUnixMs(value?: unknown): number | null {
  if (!value) return null;
  const date = new Date(String(value));
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function splitName(fullName: string, firstName?: unknown, lastName?: unknown) {
  const providedFirst = typeof firstName === "string" ? firstName.trim() : "";
  const providedLast = typeof lastName === "string" ? lastName.trim() : "";
  if (providedFirst || providedLast) {
    return { firstName: providedFirst || null, lastName: providedLast || null };
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function propertySlugFromListingId(listingId?: unknown): string | null {
  const numericId = Number(listingId);
  return Object.entries(PROPERTY_TO_HOSTAWAY_ID).find(([, id]) => id === numericId)?.[0] ?? null;
}

function getPhone(reservation: HostawayReservation): string | null {
  const phone = reservation.phone ?? reservation.guestPhone ?? reservation.guestPhoneNumber;
  if (phone === undefined || phone === null) return null;
  return String(phone).trim() || null;
}

function getChannel(reservation: HostawayReservation): string | null {
  const value = reservation.channelName ?? reservation.channel ?? reservation.source ?? reservation.originalChannel;
  return value === undefined || value === null ? null : String(value).trim() || null;
}

export async function syncWebsiteBookingCancellation(reservation: HostawayReservation) {
  if (!isHostawayReservationCancelled(reservation)) return 0;

  const reservationId = String(reservation.id ?? reservation.reservationId ?? "").trim();
  if (!/^\d{1,20}$/.test(reservationId)) return 0;

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const canonical = await db.select({ id: bookings.id }).from(bookings)
    .where(eq(bookings.hostawayReservationId, reservationId));
  const linked = await db.select({ bookingId: manualBookingLinks.bookingId }).from(manualBookingLinks)
    .where(eq(manualBookingLinks.hostawayReservationId, reservationId));
  // Guest imports contain OTA reservations too. Keep status markers restricted
  // to website-linked records rather than copying historical channel bookings.
  if (!canonical.length && !linked.length) return 0;
  // A sticky, status-only marker supports old paid manual links that have no
  // canonical booking. Never change link.status, payment references, or holds.
  await db.insert(siteSettings).values({ key: hostawayCancellationKey(reservationId), value: "cancelled" })
    .onDuplicateKeyUpdate({ set: { value: "cancelled" } });
  const bookingIds = linked.map(row => row.bookingId).filter((id): id is number => id != null);
  const updated = await db.update(bookings)
    .set({ status: "cancelled" })
    .where(and(ne(bookings.status, "cancelled"), or(
      eq(bookings.hostawayReservationId, reservationId),
      // A manual link may have the Hostaway reference before its booking does.
      // Do not cancel a booking subsequently moved to a different reservation.
      bookingIds.length ? and(inArray(bookings.id, bookingIds), isNull(bookings.hostawayReservationId)) : undefined,
    )));
  return Number((updated as any)[0]?.affectedRows ?? 0);
}

async function pause(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHostawayReservation(reservationId: string | number): Promise<HostawayReservation> {
  const normalizedId = String(reservationId).trim();
  if (!/^\d{1,20}$/.test(normalizedId)) throw new Error("Invalid Hostaway reservation ID");
  const token = await getAccessToken();
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations/${normalizedId}`, {
    headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Hostaway reservation fetch failed (${response.status})`);
  }
  const data = await response.json();
  const reservation = data.result ?? data;
  if (String(reservation.id ?? reservation.reservationId ?? "").trim() !== normalizedId) {
    throw new Error("Hostaway returned a mismatched reservation ID");
  }
  return reservation;
}

async function fetchHostawayReservationPage(offset: number): Promise<{ rows: HostawayReservation[]; hasMore: boolean }> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
    includeResources: "0",
    sortOrder: "updatedOn",
  });
  const response = await fetch(`${HOSTAWAY_API_BASE}/reservations?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`Hostaway reservation list fetch failed (${response.status})`);
  }
  const data = await response.json();
  const rows = Array.isArray(data.result) ? data.result : [];
  return {
    rows,
    // Keep paging based on the actual page size rather than response metadata.
    // Hostaway accounts can return an absent or stale totalPages field.
    hasMore: rows.length === PAGE_SIZE,
  };
}

async function updateSyncState(
  status: "running" | "success" | "failed",
  patch: Partial<{
    lastHistoricalImportAt: Date;
    lastWebhookSyncAt: Date;
    lastReconciledAt: Date;
    lastError: string | null;
    lastImportedReservations: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(guestSyncState).values({
    syncKey: SYNC_KEY,
    lastStatus: status,
    lastError: patch.lastError ?? null,
    lastHistoricalImportAt: patch.lastHistoricalImportAt ?? null,
    lastWebhookSyncAt: patch.lastWebhookSyncAt ?? null,
    lastReconciledAt: patch.lastReconciledAt ?? null,
    lastImportedReservations: patch.lastImportedReservations ?? 0,
  }).onDuplicateKeyUpdate({
    set: { lastStatus: status, ...patch },
  });
}

/**
 * Insert or update the guest profile and its one-to-one Hostaway reservation source.
 * The Hostaway reservation ID makes this operation safe to repeat for both webhooks
 * and reconciliation imports.
 */
export async function upsertGuestFromHostawayReservation(
  reservation: HostawayReservation
): Promise<{ createdGuest: boolean; createdReservation: boolean }> {
  // Critical website state must persist even if optional guest tables are absent
  // or their profile writes fail. This path has no Stripe or Hostaway mutations.
  await syncWebsiteBookingCancellation(reservation);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const reservationId = String(reservation.id ?? reservation.reservationId ?? "").trim();
  if (!reservationId) throw new Error("Hostaway reservation is missing an ID");

  const fullName = String(reservation.guestName ?? "Guest").trim() || "Guest";
  const { firstName, lastName } = splitName(fullName, reservation.guestFirstName, reservation.guestLastName);
  const email = normalizeEmail(reservation.guestEmail ?? reservation.email);
  const rawPhone = getPhone(reservation);
  const phone = rawPhone || null;
  const normalizedPhone = normalizePhone(rawPhone);
  const hostawayGuestId = reservation.guestId ?? reservation.customerUserId ?? null;
  const hostawayListingId = Number(reservation.listingMapId ?? reservation.listingId) || null;
  const propertySlug = propertySlugFromListingId(hostawayListingId);
  const channel = getChannel(reservation);
  const arrivalAt = dateToUnixMs(reservation.arrivalDate);
  const departureAt = dateToUnixMs(reservation.departureDate);
  const sourceUpdatedAt = dateToUnixMs(reservation.updatedOn ?? reservation.updatedAt);

  const existingSource = (await db.select().from(hostawayGuestReservations)
    .where(eq(hostawayGuestReservations.hostawayReservationId, reservationId)).limit(1))[0];

  let profile: typeof guestProfiles.$inferSelect | undefined;
  let createdGuest = false;
  if (existingSource) {
    profile = (await db.select().from(guestProfiles)
      .where(eq(guestProfiles.id, existingSource.guestProfileId)).limit(1))[0];
  }
  if (!profile && email) {
    profile = (await db.select().from(guestProfiles)
      .where(eq(guestProfiles.normalizedEmail, email)).limit(1))[0];
  }
  if (!profile && normalizedPhone) {
    profile = (await db.select().from(guestProfiles)
      .where(eq(guestProfiles.normalizedPhone, normalizedPhone)).limit(1))[0];
  }
  if (!profile && hostawayGuestId) {
    profile = (await db.select().from(guestProfiles)
      .where(eq(guestProfiles.hostawayGuestId, String(hostawayGuestId))).limit(1))[0];
  }

  let profileId: number;
  if (!profile) {
    const inserted = await db.insert(guestProfiles).values({
      fullName,
      firstName,
      lastName,
      email,
      normalizedEmail: email,
      phone,
      normalizedPhone,
      hostawayGuestId: hostawayGuestId ? String(hostawayGuestId) : null,
      lastHostawayReservationId: reservationId,
      lastPropertySlug: propertySlug,
      lastChannel: channel,
      totalReservations: 0,
      firstStayAt: arrivalAt,
      lastStayAt: arrivalAt,
      lastSyncedAt: new Date(),
    });
    profileId = Number((inserted[0] as any).insertId);
    createdGuest = true;
  } else {
    profileId = profile.id;
    await db.update(guestProfiles).set({
      fullName: fullName || profile.fullName,
      firstName: firstName ?? profile.firstName,
      lastName: lastName ?? profile.lastName,
      email: email ?? profile.email,
      normalizedEmail: email ?? profile.normalizedEmail,
      phone: phone ?? profile.phone,
      normalizedPhone: normalizedPhone ?? profile.normalizedPhone,
      hostawayGuestId: hostawayGuestId ? String(hostawayGuestId) : profile.hostawayGuestId,
      lastHostawayReservationId: reservationId,
      lastPropertySlug: propertySlug ?? profile.lastPropertySlug,
      lastChannel: channel ?? profile.lastChannel,
      firstStayAt: !profile.firstStayAt || (arrivalAt && arrivalAt < profile.firstStayAt) ? arrivalAt : profile.firstStayAt,
      lastStayAt: !profile.lastStayAt || (arrivalAt && arrivalAt > profile.lastStayAt) ? arrivalAt : profile.lastStayAt,
      lastSyncedAt: new Date(),
    }).where(eq(guestProfiles.id, profileId));
  }

  const createdReservation = !existingSource;
  const reservationStatus = isHostawayReservationCancelled(reservation) ? "cancelled"
    : reservation.status ?? reservation.reservationStatus ?? null;
  await db.insert(hostawayGuestReservations).values({
    hostawayReservationId: reservationId,
    guestProfileId: profileId,
    hostawayListingId,
    propertySlug,
    channel,
    reservationStatus: reservationStatus ? String(reservationStatus) : null,
    arrivalAt,
    departureAt,
    guestCount: Number(reservation.numberOfGuests ?? reservation.adults ?? 0) || null,
    sourceUpdatedAt,
    syncedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      guestProfileId: profileId,
      hostawayListingId,
      propertySlug,
      channel,
      reservationStatus: reservationStatus ? String(reservationStatus) : null,
      arrivalAt,
      departureAt,
      guestCount: Number(reservation.numberOfGuests ?? reservation.adults ?? 0) || null,
      sourceUpdatedAt,
      syncedAt: new Date(),
    },
  });

  if (createdReservation) {
    const current = (await db.select().from(guestProfiles).where(eq(guestProfiles.id, profileId)).limit(1))[0];
    if (current) {
      await db.update(guestProfiles).set({
        totalReservations: (current.totalReservations ?? 0) + 1,
      }).where(eq(guestProfiles.id, profileId));
    }
  }

  return { createdGuest, createdReservation };
}

export async function syncHostawayReservationById(reservationId: string | number) {
  const reservation = await fetchHostawayReservation(reservationId);
  try {
    const result = await upsertGuestFromHostawayReservation(reservation);
    await updateSyncState("success", { lastWebhookSyncAt: new Date(), lastError: null, lastImportedReservations: 1 });
    return result;
  } catch (error) {
    if (!isHostawayReservationCancelled(reservation)) throw error;
    // Recheck the critical write before acknowledging a cancellation if optional
    // contact/state tables failed. Failure of this write still returns webhook 500.
    await syncWebsiteBookingCancellation(reservation);
    console.warn("[Hostaway sync] Cancellation persisted; guest directory sync failed:", error);
    return { createdGuest: false, createdReservation: false, guestDirectorySynced: false };
  }
}

/** Read only already-linked website reservations, never the historical guest list.
 * A request is capped at 25 unique IDs and failures are reported per reservation. */
export async function refreshLinkedHostawayBookingStatuses(reservationIds: string[]) {
  const ids = Array.from(new Set(reservationIds.map(id => id.trim())));
  if (ids.length > 25 || ids.some(id => !/^\d{1,20}$/.test(id))) throw new Error("Invalid status refresh batch");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!ids.length) return { checked: 0, cancelled: 0, updatedBookings: 0, failedReservationIds: [] as string[] };
  const bookingRows = await db.select({ hostawayReservationId: bookings.hostawayReservationId }).from(bookings)
    .where(inArray(bookings.hostawayReservationId, ids));
  const linkRows = await db.select({ hostawayReservationId: manualBookingLinks.hostawayReservationId }).from(manualBookingLinks)
    .where(inArray(manualBookingLinks.hostawayReservationId, ids));
  const allowedIds = new Set([...bookingRows, ...linkRows].map(row => row.hostawayReservationId));
  if (ids.some(id => !allowedIds.has(id))) throw new Error("Only linked website reservations may be refreshed");
  const summary = { checked: 0, cancelled: 0, updatedBookings: 0, failedReservationIds: [] as string[] };
  // Three workers bound API concurrency and wall time; no contact tables touched.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const reservation = await fetchHostawayReservation(id);
        const updatedBookings = await syncWebsiteBookingCancellation(reservation);
        summary.updatedBookings += updatedBookings;
        summary.checked += 1;
        if (isHostawayReservationCancelled(reservation)) summary.cancelled += 1;
      } catch (error) {
        summary.failedReservationIds.push(id);
        console.warn(`[Hostaway status refresh] reservation ${id} failed:`, error);
      }
      if (next < ids.length) await pause(REQUEST_DELAY_MS);
    }
  }));
  return summary;
}

/** Full historical import or reconciliation. Uses paginated calls and rate limiting. */
export async function syncAllHostawayGuests(mode: "historical" | "reconcile" = "reconcile"): Promise<GuestSyncResult> {
  await updateSyncState("running", { lastError: null, lastImportedReservations: 0 });
  const summary: GuestSyncResult = {
    processed: 0,
    createdGuests: 0,
    updatedGuests: 0,
    createdReservations: 0,
    updatedReservations: 0,
  };

  try {
    let offset = 0;
    let hasMore = true;
    do {
      const page = await fetchHostawayReservationPage(offset);
      for (const reservation of page.rows) {
        const saved = await upsertGuestFromHostawayReservation(reservation);
        summary.processed += 1;
        if (saved.createdGuest) summary.createdGuests += 1;
        else summary.updatedGuests += 1;
        if (saved.createdReservation) summary.createdReservations += 1;
        else summary.updatedReservations += 1;
      }
      offset += PAGE_SIZE;
      hasMore = page.hasMore;
      if (hasMore) await pause(REQUEST_DELAY_MS);
    } while (hasMore);

    await updateSyncState("success", {
      lastError: null,
      lastImportedReservations: summary.processed,
      ...(mode === "historical" ? { lastHistoricalImportAt: new Date() } : { lastReconciledAt: new Date() }),
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Guest synchronization failed";
    await updateSyncState("failed", { lastError: message, lastImportedReservations: summary.processed });
    throw error;
  }
}

/**
 * Bounded safety-net reconciliation for Heartbeat. Webhooks handle the fast
 * path; this checks the 100 most recently updated reservations so it remains
 * comfortably within the scheduler's two-minute callback limit.
 */
export async function syncRecentHostawayGuests(): Promise<GuestSyncResult> {
  await updateSyncState("running", { lastError: null, lastImportedReservations: 0 });
  const summary: GuestSyncResult = {
    processed: 0,
    createdGuests: 0,
    updatedGuests: 0,
    createdReservations: 0,
    updatedReservations: 0,
  };

  try {
    const page = await fetchHostawayReservationPage(0);
    for (const reservation of page.rows) {
      const saved = await upsertGuestFromHostawayReservation(reservation);
      summary.processed += 1;
      if (saved.createdGuest) summary.createdGuests += 1;
      else summary.updatedGuests += 1;
      if (saved.createdReservation) summary.createdReservations += 1;
      else summary.updatedReservations += 1;
    }

    await updateSyncState("success", {
      lastError: null,
      lastImportedReservations: summary.processed,
      lastReconciledAt: new Date(),
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Guest synchronization failed";
    await updateSyncState("failed", { lastError: message, lastImportedReservations: summary.processed });
    throw error;
  }
}

export async function getGuestSyncStatus() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(guestSyncState).where(eq(guestSyncState.syncKey, SYNC_KEY)).limit(1))[0] ?? null;
}
