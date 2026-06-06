import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getPropertyCalendar, getListingBasePrice, PROPERTY_TO_HOSTAWAY_ID } from "./hostaway";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { bookingRouter } from "./routers/booking";
import { adminRouter } from "./routers/admin";
import { propertiesRouter } from "./routers/properties";
import { adminAuthRouter } from "./routers/adminAuth";

export const appRouter = router({
  booking: bookingRouter,
  admin: adminRouter,
  properties: propertiesRouter,
  adminAuth: adminAuthRouter,
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
