/**
 * Heartbeat handler: retry-pending-bookings
 *
 * Runs every 15 minutes via the Manus Heartbeat scheduler.
 * Finds bookings that are still "pending" but have a completed Stripe Checkout
 * Session (payment_status === "paid"), then re-runs the full confirmation flow
 * (Hostaway reservation creation + status update + owner notification).
 *
 * This catches cases where the Stripe webhook fired but the server was cold-
 * starting, or where the guest closed the tab before the confirmation page ran
 * the fallback confirmation.
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { bookings } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { confirmStripeCheckoutSession } from "./routers/booking";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function retryPendingBookingsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
  } catch {
    return res.status(403).json({ error: "cron-only" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  // Find bookings that are still "pending" and were created more than 5 minutes
  // ago (give the webhook time to fire first) but less than 24 hours ago
  // (older than that are likely genuinely abandoned).
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  let pendingBookings: typeof bookings.$inferSelect[] = [];
  try {
    pendingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "pending"),
          // Filter by time in JS below — createdAt is a Date column in MySQL
        )
      )
      .limit(20);

    // Filter in JS: only bookings created between 5 min and 24h ago
    pendingBookings = pendingBookings.filter(
      (b) => {
        const ts = b.createdAt instanceof Date ? b.createdAt.getTime() : Number(b.createdAt);
        return ts < fiveMinutesAgo && ts > twentyFourHoursAgo;
      }
    );
  } catch (err: any) {
    console.error("[RetryJob] Failed to query pending bookings:", err.message);
    return res.status(500).json({ error: err.message });
  }

  if (pendingBookings.length === 0) {
    return res.json({ ok: true, checked: 0, confirmed: 0, failed: 0 });
  }

  console.log(`[RetryJob] Found ${pendingBookings.length} pending booking(s) to check`);

  let confirmed = 0;
  let failed = 0;
  const results: { bookingId: number; outcome: string }[] = [];

  for (const booking of pendingBookings) {
    try {
      // Each pending booking should have a Stripe checkout session ID stored
      // in the stripePaymentIntentId field (we store the session ID there too)
      // or we can look it up via the booking ID in Stripe's metadata.
      // Strategy: search Stripe for checkout sessions with this booking's ID.
      const sessions = await stripe.checkout.sessions.list({
        limit: 5,
      });

      // Find the session matching this booking by client_reference_id
      let matchedSession: Stripe.Checkout.Session | null = null;

      // First try: search recent sessions for this booking ID
      for (const session of sessions.data) {
        if (session.client_reference_id === String(booking.id)) {
          matchedSession = session;
          break;
        }
      }

      // If not in recent 5, do a broader search
      if (!matchedSession) {
        const allSessions = await stripe.checkout.sessions.list({ limit: 100 });
        for (const session of allSessions.data) {
          if (session.client_reference_id === String(booking.id)) {
            matchedSession = session;
            break;
          }
        }
      }

      if (!matchedSession) {
        console.log(`[RetryJob] No Stripe session found for booking #${booking.id} — skipping`);
        results.push({ bookingId: booking.id, outcome: "no_session_found" });
        continue;
      }

      if (matchedSession.payment_status !== "paid") {
        // Payment genuinely not completed — mark as failed so it doesn't keep appearing
        await db
          .update(bookings)
          .set({ status: "failed" })
          .where(eq(bookings.id, booking.id));
        console.log(`[RetryJob] Booking #${booking.id} session ${matchedSession.id} not paid (${matchedSession.payment_status}) — marked failed`);
        results.push({ bookingId: booking.id, outcome: `marked_failed:${matchedSession.payment_status}` });
        continue;
      }

      // Payment IS paid — run the full confirmation flow
      console.log(`[RetryJob] Booking #${booking.id} has paid session ${matchedSession.id} — confirming now`);
      await confirmStripeCheckoutSession(matchedSession);
      confirmed++;
      results.push({ bookingId: booking.id, outcome: "confirmed" });
      console.log(`[RetryJob] ✅ Booking #${booking.id} confirmed successfully`);

    } catch (err: any) {
      failed++;
      console.error(`[RetryJob] ❌ Failed to process booking #${booking.id}:`, err.message);
      results.push({ bookingId: booking.id, outcome: `error:${err.message}` });

      // Notify owner of retry failure for manual intervention
      try {
        await notifyOwner({
          title: `⚠️ Retry Job Failed — Booking #${booking.id}`,
          content: [
            `The automatic retry job could not confirm booking #${booking.id}.`,
            `**Guest:** ${booking.guestName} <${booking.guestEmail}>`,
            `**Property:** ${booking.propertyId}`,
            `**Dates:** ${new Date(booking.checkIn as number).toLocaleDateString("en-US", { timeZone: "UTC" })} – ${new Date(booking.checkOut as number).toLocaleDateString("en-US", { timeZone: "UTC" })}`,
            `**Error:** ${err.message}`,
            `Please check Stripe and create the Hostaway reservation manually if payment was collected.`,
          ].join("\n"),
        });
      } catch (_) { /* non-fatal */ }
    }
  }

  // Summary notification if anything was confirmed
  if (confirmed > 0) {
    try {
      await notifyOwner({
        title: `✅ Retry Job: ${confirmed} booking(s) auto-confirmed`,
        content: [
          `The 15-minute retry job caught ${confirmed} booking(s) that the webhook missed.`,
          `These have now been confirmed and synced to Hostaway.`,
          ...results.filter(r => r.outcome === "confirmed").map(r => `• Booking #${r.bookingId}`),
        ].join("\n"),
      });
    } catch (_) { /* non-fatal */ }
  }

  return res.json({
    ok: true,
    checked: pendingBookings.length,
    confirmed,
    failed,
    results,
  });
}
