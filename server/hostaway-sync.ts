/**
 * Hostaway → Database Sync Engine
 *
 * Fetches all active listings from Hostaway and upserts them into the
 * local `properties`, `property_photos`, and `property_amenities` tables.
 *
 * Rules:
 *  - New listings are inserted automatically (active = 1).
 *  - Existing listings are updated for: name, description, photos, amenities,
 *    guests, bedrooms, bathrooms, check-in/out times.
 *  - Fields the admin has customised (shortName, slug, cleaningFee, sortOrder,
 *    neighborhood, cancellationPolicy, active) are NOT overwritten by sync —
 *    the admin owns those.
 *  - Photos are fully replaced on each sync (Hostaway is the source of truth).
 *  - Amenities are fully replaced on each sync.
 */

import { getAccessToken } from "./hostaway-auth";
import { getDb } from "./db";
import { properties, propertyPhotos, propertyAmenities } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";

// ── Hostaway API types ────────────────────────────────────────────────────────

interface HostawayListing {
  id: number;
  name: string;
  internalListingName?: string;
  description?: string;
  personCapacity?: number;
  bedroomsNumber?: number;
  bathroomsNumber?: number;
  /** Hostaway returns check-in/out times as 24-hour integers (e.g. 15 = 3 PM, 11 = 11 AM) */
  checkInTimeStart?: number;
  checkInTimeEnd?: number;
  checkOutTime?: number;
  houseRules?: string;
  propertyType?: string;
  listingImages?: { url: string; sortOrder?: number }[];
  amenities?: string[];
  address?: {
    city?: string;
    state?: string;
    neighborhood?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a Hostaway listing name to a URL-safe slug */
function toSlug(name: string, id: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return base || `listing-${id}`;
}

/** Ensure slug is unique by appending -2, -3 … if needed */
async function uniqueSlug(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  candidate: string,
  excludeHostawayId: number
): Promise<string> {
  let slug = candidate;
  let attempt = 2;
  while (true) {
    const [existing] = await db
      .select({ id: properties.id, hostawayListingId: properties.hostawayListingId })
      .from(properties)
      .where(eq(properties.slug, slug))
      .limit(1);
    if (!existing || existing.hostawayListingId === excludeHostawayId) break;
    slug = `${candidate}-${attempt++}`;
  }
  return slug;
}

/**
 * Convert a 24-hour integer (e.g. 15) to a readable 12-hour time string (e.g. "3:00 PM").
 * Returns null if the value is missing or invalid.
 */
function formatHour(hour?: number | null): string | null {
  if (hour == null || isNaN(hour)) return null;
  const h = Math.floor(hour);
  if (h < 0 || h > 23) return null;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

/** Map Hostaway propertyType string to our type enum */
function mapPropertyType(raw?: string): string {
  if (!raw) return "House";
  const lower = raw.toLowerCase();
  if (lower.includes("townhouse") || lower.includes("town house")) return "Townhouse";
  if (lower.includes("condo") || lower.includes("apartment")) return "Condo";
  if (lower.includes("cabin")) return "Cabin";
  if (lower.includes("villa")) return "Villa";
  return "House";
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function syncHostawayListings(): Promise<SyncResult> {
  const result: SyncResult = { total: 0, created: 0, updated: 0, skipped: 0, errors: [] };

  const db = await getDb();
  if (!db) {
    result.errors.push("Database connection unavailable");
    return result;
  }

  // 1. Fetch all listings from Hostaway
  let listings: HostawayListing[] = [];
  try {
    const token = await getAccessToken();
    const res = await fetch(`${HOSTAWAY_API_BASE}/listings?limit=100&includeResources=1`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
    });
    if (!res.ok) throw new Error(`Hostaway listings fetch failed: ${res.status}`);
    const data = await res.json();
    listings = data.result ?? [];
  } catch (err: any) {
    result.errors.push(`Hostaway API error: ${err.message}`);
    return result;
  }

  result.total = listings.length;

  // 2. Process each listing
  for (const listing of listings) {
    try {
      const [existing] = await db
        .select()
        .from(properties)
        .where(eq(properties.hostawayListingId, listing.id))
        .limit(1);

      const photos = (listing.listingImages ?? [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((img) => img.url)
        .filter(Boolean);

      const amenitiesList = (listing.amenities ?? []).filter(Boolean);

      if (existing) {
        // ── UPDATE existing property ──────────────────────────────────────
        // Only overwrite fields that Hostaway owns; preserve admin-owned fields.
        await db
          .update(properties)
          .set({
            name: listing.name ?? existing.name,
            description: listing.description ?? existing.description,
            guests: listing.personCapacity ?? existing.guests,
            bedrooms: listing.bedroomsNumber ?? existing.bedrooms,
            bathrooms: String(listing.bathroomsNumber ?? existing.bathrooms) as any,
            checkInTime: formatHour(listing.checkInTimeStart) ?? existing.checkInTime,
            checkOutTime: formatHour(listing.checkOutTime) ?? existing.checkOutTime,
            houseRules: listing.houseRules ?? existing.houseRules,
            type: mapPropertyType(listing.propertyType),
          })
          .where(eq(properties.id, existing.id));

        // Replace photos
        await db.delete(propertyPhotos).where(eq(propertyPhotos.propertyId, existing.id));
        if (photos.length > 0) {
          await db.insert(propertyPhotos).values(
            photos.map((url, i) => ({ propertyId: existing.id, url, sortOrder: i }))
          );
        }

        // Replace amenities
        await db.delete(propertyAmenities).where(eq(propertyAmenities.propertyId, existing.id));
        if (amenitiesList.length > 0) {
          await db.insert(propertyAmenities).values(
            amenitiesList.map((amenity, i) => ({ propertyId: existing.id, amenity, sortOrder: i }))
          );
        }

        result.updated++;
      } else {
        // ── INSERT new property ───────────────────────────────────────────
        const candidateSlug = toSlug(listing.name, listing.id);
        const slug = await uniqueSlug(db, candidateSlug, listing.id);

        // shortName: first 3 words of the name, max 40 chars
        const shortName = listing.name.split(" ").slice(0, 3).join(" ").slice(0, 40);

        const [inserted] = await db
          .insert(properties)
          .values({
            slug,
            name: listing.name,
            shortName,
            type: mapPropertyType(listing.propertyType),
            guests: listing.personCapacity ?? 4,
            bedrooms: listing.bedroomsNumber ?? 2,
            bathrooms: String(listing.bathroomsNumber ?? 1) as any,
            description: listing.description ?? null,
            checkInTime: formatHour(listing.checkInTimeStart) ?? "3:00 PM",
            checkOutTime: formatHour(listing.checkOutTime) ?? "11:00 AM",
            houseRules: listing.houseRules ?? null,
            hostawayListingId: listing.id,
            active: 1,
            sortOrder: 99, // New listings go to the bottom; admin can reorder
          })
          .$returningId();

        const newId = inserted.id;

        if (photos.length > 0) {
          await db.insert(propertyPhotos).values(
            photos.map((url, i) => ({ propertyId: newId, url, sortOrder: i }))
          );
        }
        if (amenitiesList.length > 0) {
          await db.insert(propertyAmenities).values(
            amenitiesList.map((amenity, i) => ({ propertyId: newId, amenity, sortOrder: i }))
          );
        }

        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`Listing ${listing.id} (${listing.name}): ${err.message}`);
      result.skipped++;
    }
  }

  return result;
}
