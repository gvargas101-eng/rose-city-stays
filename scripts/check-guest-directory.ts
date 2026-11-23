import { and, count, isNotNull, ne, sql } from "drizzle-orm";
import { guestProfiles, hostawayGuestReservations, bookings, properties } from "../drizzle/schema";
import { getDb } from "../server/db";
import { searchGuestProfiles } from "../server/guest-search";
import { getGuestSyncStatus, syncAllHostawayGuests } from "../server/hostaway-guests";

// Private aggregates only. --import reads Hostaway and writes contact/history tables;
// it never creates reservations, charges, refunds or deposit holds.
async function main() {
  const db = await getDb();
  if (!db) throw new Error("Guest database unavailable");
  if (process.argv.includes("--import")) {
    console.info("Beginning contacts/history-only Hostaway import");
    console.info(JSON.stringify(await syncAllHostawayGuests("historical")));
  }
  const [directory] = await db.select({ total: count(), named: sql<number>`SUM(CASE WHEN ${guestProfiles.fullName} <> 'Guest' THEN 1 ELSE 0 END)` }).from(guestProfiles);
  const [history] = await db.select({ total: count() }).from(hostawayGuestReservations);
  const [bookingCount] = await db.select({ total: count() }).from(bookings);
  const [privateProperty] = await db.select({ active: properties.active }).from(properties).where(sql`${properties.hostawayListingId} = 630308`).limit(1);
  const status = await getGuestSyncStatus();
  console.info(JSON.stringify({ directory, history, bookingCount, alamoCrossingActive: privateProperty?.active, importComplete: !!status?.lastHistoricalImportAt, lastStatus: status?.lastStatus }));
  const samples = await db.select({ id: guestProfiles.id, name: guestProfiles.fullName, email: guestProfiles.email, phone: guestProfiles.normalizedPhone }).from(guestProfiles)
    .where(and(ne(guestProfiles.fullName, "Guest"), isNotNull(guestProfiles.fullName))).limit(10);
  let nameChecks = 0, emailChecks = 0, phoneChecks = 0;
  for (const sample of samples) {
    const token = sample.name.trim().split(/\s+/)[0].slice(0, 3);
    if (token.length < 2) continue;
    const lower = await searchGuestProfiles(token.toLowerCase());
    const upper = await searchGuestProfiles(token.toUpperCase());
    if (!lower.length || lower.map(x => x.id).join() !== upper.map(x => x.id).join()) throw new Error("Case-insensitive lookup verification failed");
    const full = await searchGuestProfiles(sample.name);
    if (!full.some(x => x.id === sample.id)) throw new Error("Full-name lookup verification failed");
    nameChecks += 1;
    if (sample.email) {
      const matches = await searchGuestProfiles(sample.email.toUpperCase());
      if (!matches.some(x => x.id === sample.id)) throw new Error("Email lookup verification failed");
      emailChecks += 1;
    }
    if (sample.phone && sample.phone.length >= 7) {
      const digits = sample.phone.slice(-7);
      const formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      const matches = await searchGuestProfiles(formatted);
      if (!matches.some(x => x.id === sample.id)) throw new Error("Formatted-phone lookup verification failed");
      phoneChecks += 1;
    }
  }
  // Older channel stays may retain names but omit email; verify separately when available.
  const emailSamples = await db.select({ id: guestProfiles.id, email: guestProfiles.email }).from(guestProfiles)
    .where(isNotNull(guestProfiles.email)).limit(5);
  for (const sample of emailSamples) {
    const matches = await searchGuestProfiles(sample.email!.toUpperCase());
    if (!matches.some(x => x.id === sample.id)) throw new Error("Available email lookup verification failed");
    emailChecks += 1;
  }
  console.info(JSON.stringify({ verifiedSampleNames: nameChecks, verifiedEmails: emailChecks, verifiedFormattedPhones: phoneChecks, contactDetailsLogged: false }));
}
main().then(() => process.exit(0)).catch(error => {
  // Do not log raw SQL errors, which can include a guest's name/phone in parameters.
  console.error(error instanceof Error && !error.message.startsWith("Failed query:") ? error.message : "Guest directory operation failed; inspect private server logs.");
  process.exit(1);
});
