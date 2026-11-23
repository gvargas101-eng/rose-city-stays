import { and, asc, desc, or, sql } from "drizzle-orm";
import { guestProfiles } from "../drizzle/schema";
import { getDb } from "./db";

/** Escape SQL LIKE wildcards without depending on MySQL's backslash mode. */
export function guestSearchPattern(value: string) {
  return `%${value.replace(/[!%_]/g, character => `!${character}`)}%`;
}
export function buildGuestSearchCondition(query: string) {
  const cleaned = query.trim().replace(/\s+/g, " ").toLowerCase();
  if (!cleaned || cleaned.length > 120) throw new Error("Enter between 1 and 120 characters to search previous guests.");
  // Independent name tokens also find 'Smith Jane' when the stored name is 'Jane Smith'.
  const tokens = cleaned.split(" ");
  const textMatch = and(...tokens.map(token => {
    const pattern = guestSearchPattern(token);
    return or(
      sql`LOWER(${guestProfiles.fullName}) LIKE ${pattern} ESCAPE '!'`,
      sql`LOWER(${guestProfiles.firstName}) LIKE ${pattern} ESCAPE '!'`,
      sql`LOWER(${guestProfiles.lastName}) LIKE ${pattern} ESCAPE '!'`,
      sql`LOWER(${guestProfiles.email}) LIKE ${pattern} ESCAPE '!'`,
      sql`${guestProfiles.phone} LIKE ${pattern} ESCAPE '!'`,
    );
  }));
  const phoneDigits = /^[+\d\s().-]+$/.test(cleaned) ? cleaned.replace(/\D/g, "") : "";
  return or(textMatch, phoneDigits.length >= 2
    ? sql`${guestProfiles.normalizedPhone} LIKE ${guestSearchPattern(phoneDigits)} ESCAPE '!'`
    : undefined);
}

/** Private contact projection only; never return identity documents, payment data or internal notes. */
export async function searchGuestProfiles(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Guest directory is unavailable. Please try again.");
  return db.select({
    id: guestProfiles.id, fullName: guestProfiles.fullName, email: guestProfiles.email,
    phone: guestProfiles.phone, lastPropertySlug: guestProfiles.lastPropertySlug,
    lastChannel: guestProfiles.lastChannel, totalReservations: guestProfiles.totalReservations,
    lastStayAt: guestProfiles.lastStayAt,
  }).from(guestProfiles).where(buildGuestSearchCondition(query))
    .orderBy(desc(guestProfiles.lastStayAt), asc(guestProfiles.fullName)).limit(12);
}
