/**
 * Booking router — handles direct reservations with Stripe payment
 * Flow: createPaymentIntent → (Stripe collects card) → confirmBooking → Hostaway reservation
 */

import Stripe from "stripe";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { bookings } from "../../drizzle/schema";
import { PROPERTY_TO_HOSTAWAY_ID } from "../hostaway";
import { createHostawayReservation } from "../hostaway-booking";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Cleaning fees per property (in USD)
const CLEANING_FEES: Record<string, number> = {
  "the-briar": 150,
  "hospital-district": 125,
  "hollytree-golf-dining": 150,
  "alamo-house": 175,
  "green-acres": 150,
  "legacy-house": 150,
  "azalea-spring-cottage": 125,
  "noir-hollytree": 125,
  "hollytree-king-bed": 125,
  "hollytree-townhouse": 125,
};

export const bookingRouter = router({
  /**
   * Step 1: Create a Stripe PaymentIntent and a pending booking record.
   * Returns the clientSecret for the Stripe Elements card form.
   */
  createPaymentIntent: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        propertyName: z.string(),
        checkIn: z.string(),   // YYYY-MM-DD
        checkOut: z.string(),  // YYYY-MM-DD
        nights: z.number().int().min(1),
        nightlyRate: z.number().positive(),
        guestCount: z.number().int().min(1),
        guestName: z.string().min(1),
        guestEmail: z.string().email(),
        guestPhone: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const hostawayListingId = PROPERTY_TO_HOSTAWAY_ID[input.propertyId];
      if (!hostawayListingId) {
        throw new Error(`Property not found: ${input.propertyId}`);
      }

      const cleaningFee = CLEANING_FEES[input.propertyId] ?? 125;
      const subtotal = Math.round(input.nightlyRate * input.nights * 100) / 100;
      const totalAmount = Math.round((subtotal + cleaningFee) * 100) / 100;
      const totalCents = Math.round(totalAmount * 100);

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        description: `Rose City Stays — ${input.propertyName} (${input.checkIn} to ${input.checkOut})`,
        receipt_email: input.guestEmail,
        metadata: {
          propertyId: input.propertyId,
          propertyName: input.propertyName,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights: String(input.nights),
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestCount: String(input.guestCount),
        },
      });

      // Create pending booking record
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(bookings).values({
        propertyId: input.propertyId,
        hostawayListingId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone || null,
        guestCount: input.guestCount,
        checkIn: new Date(input.checkIn).getTime(),
        checkOut: new Date(input.checkOut).getTime(),
        nights: input.nights,
        nightlyRate: String(input.nightlyRate),
        subtotal: String(subtotal),
        cleaningFee: String(cleaningFee),
        totalAmount: String(totalAmount),
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
        message: input.message || null,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        bookingId: paymentIntent.id,
        totalAmount,
        cleaningFee,
        subtotal,
      };
    }),

  /**
   * Step 2: Called after Stripe payment succeeds on the frontend.
   * Verifies payment, creates Hostaway reservation, updates booking status.
   */
  confirmBooking: publicProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
      }

      // Find the booking record
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.stripePaymentIntentId, input.paymentIntentId))
        .limit(1);

      if (!booking) {
        throw new Error("Booking record not found");
      }

      if (booking.status === "confirmed") {
        // Already confirmed (idempotent)
        return { success: true, hostawayReservationId: booking.hostawayReservationId };
      }

      // Create reservation in Hostaway
      let hostawayReservationId: string | null = null;
      try {
        const checkInDate = new Date(booking.checkIn).toISOString().split("T")[0];
        const checkOutDate = new Date(booking.checkOut).toISOString().split("T")[0];

        const reservation = await createHostawayReservation({
          hostawayListingId: booking.hostawayListingId,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone || undefined,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          adults: booking.guestCount,
          totalPrice: Number(booking.totalAmount),
          message: booking.message || undefined,
          stripePaymentIntentId: input.paymentIntentId,
        });

        hostawayReservationId = reservation.id;
      } catch (err) {
        console.error("[Booking] Hostaway reservation creation failed:", err);
        // Don't fail the booking — payment succeeded. Log and notify owner.
        await notifyOwner({
          title: `⚠️ Hostaway Sync Failed — ${booking.guestName}`,
          content: `Payment succeeded (${input.paymentIntentId}) but Hostaway reservation creation failed.\n\nGuest: ${booking.guestName} <${booking.guestEmail}>\nProperty: ${booking.propertyId}\nDates: ${new Date(booking.checkIn).toLocaleDateString()} – ${new Date(booking.checkOut).toLocaleDateString()}\n\nPlease create the reservation manually in Hostaway.\n\nError: ${String(err)}`,
        });
      }

      // Update booking to confirmed
      await db
        .update(bookings)
        .set({
          status: "confirmed",
          hostawayReservationId,
        })
        .where(eq(bookings.stripePaymentIntentId, input.paymentIntentId));

      // Notify owner of new booking
      await notifyOwner({
        title: `🎉 New Direct Booking — ${booking.guestName}`,
        content: [
          `**Guest:** ${booking.guestName} <${booking.guestEmail}>`,
          booking.guestPhone ? `**Phone:** ${booking.guestPhone}` : null,
          `**Property:** ${booking.propertyId}`,
          `**Check-in:** ${new Date(booking.checkIn).toLocaleDateString()}`,
          `**Check-out:** ${new Date(booking.checkOut).toLocaleDateString()}`,
          `**Nights:** ${booking.nights}`,
          `**Guests:** ${booking.guestCount}`,
          `**Total:** $${booking.totalAmount}`,
          `**Stripe:** ${input.paymentIntentId}`,
          hostawayReservationId ? `**Hostaway Reservation:** ${hostawayReservationId}` : "⚠️ Hostaway sync failed — create manually",
          booking.message ? `**Message:** ${booking.message}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      return {
        success: true,
        hostawayReservationId,
        booking: {
          id: booking.id,
          propertyId: booking.propertyId,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
          guestCount: booking.guestCount,
          totalAmount: booking.totalAmount,
          cleaningFee: booking.cleaningFee,
          nightlyRate: booking.nightlyRate,
        },
      };
    }),

  /**
   * Get booking details by payment intent ID (for confirmation page)
   */
  getByPaymentIntent: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      const db2 = await getDb();
      if (!db2) return null;
      const [booking] = await db2
        .select()
        .from(bookings)
        .where(eq(bookings.stripePaymentIntentId, input.paymentIntentId))
        .limit(1);

      if (!booking) return null;

      return {
        id: booking.id,
        propertyId: booking.propertyId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guestCount: booking.guestCount,
        totalAmount: booking.totalAmount,
        cleaningFee: booking.cleaningFee,
        nightlyRate: booking.nightlyRate,
        status: booking.status,
        hostawayReservationId: booking.hostawayReservationId,
      };
    }),
});
