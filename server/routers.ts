import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getPropertyCalendar, getListingBasePrice, getBatchBasePrices, PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";
import { getDb } from "./db";
import { siteSettings, bookings } from "../drizzle/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { bookingRouter } from "./routers/booking";
import { adminRouter } from "./routers/admin";
import { propertiesRouter } from "./routers/properties";
import { adminAuthRouter } from "./routers/adminAuth";
import { blogRouter } from "./routers/blog";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
  properties: propertiesRouter,
  adminAuth: adminAuthRouter,
  blog: blogRouter,
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  hostaway: router({
    // Get availability calendar for a property (next N days)
    calendar: publicProcedure
      .input(
        z.object({
          propertyId: z.string(),
          startDate: z.string(), // YYYY-MM-DD
          endDate: z.string(),   // YYYY-MM-DD
        })
      )
      .query(async ({ input }) => {
        const days = await getPropertyCalendar(
          input.propertyId,
          input.startDate,
          input.endDate
        );

        // Overlay DB bookings (paid/confirmed) as blocked dates so they appear
        // unavailable immediately after payment, before Hostaway sync completes.
        try {
          const db0 = await getDb();
          if (db0) {
            const startMs = new Date(input.startDate).getTime();
            const endMs = new Date(input.endDate).getTime() + 86400000; // inclusive
            const dbBookings = await db0
              .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
              .from(bookings)
              .where(
                and(
                  eq(bookings.propertyId, input.propertyId),
                  inArray(bookings.status, ["paid", "confirmed"]),
                  lte(bookings.checkIn, endMs),
                  gte(bookings.checkOut, startMs)
                )
              );

            if (dbBookings.length > 0) {
              // Build a set of blocked date strings from DB bookings
              const blockedDates = new Set<string>();
              for (const b of dbBookings) {
                let cur = new Date(b.checkIn);
                const end = new Date(b.checkOut);
                while (cur < end) {
                  blockedDates.add(cur.toISOString().split("T")[0]);
                  cur = new Date(cur.getTime() + 86400000);
                }
              }
              // Override isAvailable for any date covered by a DB booking
              return {
                days: days.map(d =>
                  blockedDates.has(d.date)
                    ? { ...d, isAvailable: false, status: "reserved" }
                    : d
                ),
              };
            }
          }
        } catch {
          // Non-fatal: fall through to return Hostaway data as-is
        }

        return { days };
      }),

    // Get starting price for a property
    basePrice: publicProcedure
      .input(z.object({ propertyId: z.string() }))
      .query(async ({ input }) => {
        const price = await getListingBasePrice(input.propertyId);
        return { price };
      }),

    // Check if Hostaway is configured for a property
    isSupported: publicProcedure
      .input(z.object({ propertyId: z.string() }))
      .query(({ input }) => {
        return { supported: input.propertyId in PROPERTY_TO_HOSTAWAY_ID };
      }),

    // Get starting prices for multiple properties at once
    batchPrices: publicProcedure
      .input(z.object({ propertyIds: z.array(z.string()) }))
      .query(async ({ input }) => {
        const prices = await getBatchBasePrices(input.propertyIds);
        return { prices };
      }),
  }),

  settings: router({
    // Public: get the current tax rate for use in booking quote preview
    getTaxRate: publicProcedure.query(async () => {
      const db0 = await getDb();
      if (!db0) return { taxRate: 0.09 };
      const [row] = await db0.select().from(siteSettings).where(eq(siteSettings.key, "taxRate")).limit(1);
      const taxRate = row ? parseFloat(row.value) : 0.09;
      return { taxRate };
    }),

    // Public: get all active custom fees for the booking quote
    getActiveFees: publicProcedure.query(async () => {
      const db0 = await getDb();
      if (!db0) return [];
      const { customFees: customFeesTable } = await import("../drizzle/schema");
      const { asc } = await import("drizzle-orm");
      const rows = await db0
        .select()
        .from(customFeesTable)
        .where(eq(customFeesTable.active, 1))
        .orderBy(asc(customFeesTable.sortOrder));
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type as "flat" | "percent",
        amount: parseFloat(r.amount),
      }));
    }),
  }),

  inquiry: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          dates: z.string().optional(),
          guests: z.string().optional(),
          property: z.string().optional(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const lines = [
          `**Name:** ${input.name}`,
          `**Email:** ${input.email}`,
          input.phone ? `**Phone:** ${input.phone}` : null,
          input.dates ? `**Dates:** ${input.dates}` : null,
          input.guests ? `**Guests:** ${input.guests}` : null,
          input.property ? `**Property:** ${input.property}` : null,
          input.message ? `**Message:** ${input.message}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        await notifyOwner({
          title: `New Inquiry from ${input.name}`,
          content: lines,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
