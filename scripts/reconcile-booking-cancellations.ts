/** One-time maintenance: authoritative Hostaway reads and website status repair only.
 * Never creates/cancels reservations, charges/refunds money, or changes holds.
 * Run with the project's configured environment: pnpm exec tsx scripts/reconcile-booking-cancellations.ts
 */
import mysql from "mysql2/promise";
import { refreshLinkedHostawayBookingStatuses } from "../server/hostaway-guests";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await connection.query<any[]>(
    "SELECT hostawayReservationId FROM bookings WHERE hostawayReservationId IS NOT NULL UNION SELECT hostawayReservationId FROM manual_booking_links WHERE hostawayReservationId IS NOT NULL"
  );
  const ids = rows.map(row => String(row.hostawayReservationId).trim()).filter(id => /^\d{1,20}$/.test(id));
  const summary = { linkedReservations: ids.length, checked: 0, cancelled: 0, updatedBookings: 0, failedReservationIds: [] as string[] };
  for (let offset = 0; offset < ids.length; offset += 25) {
    console.log(`Checking linked reservation batch ${Math.floor(offset / 25) + 1}...`);
    const result = await refreshLinkedHostawayBookingStatuses(ids.slice(offset, offset + 25));
    summary.checked += result.checked;
    summary.cancelled += result.cancelled;
    summary.updatedBookings += result.updatedBookings;
    summary.failedReservationIds.push(...result.failedReservationIds);
    console.log(JSON.stringify({ checked: summary.checked, cancelled: summary.cancelled, repaired: summary.updatedBookings, failed: summary.failedReservationIds.length }));
  }
  const [statuses] = await connection.query("SELECT status, COUNT(*) AS total FROM bookings GROUP BY status");
  console.log(JSON.stringify({ summary, websiteStatusCounts: statuses }, null, 2));
  await connection.end();
  process.exit(summary.failedReservationIds.length ? 1 : 0);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Status reconciliation failed"); process.exit(1); });
