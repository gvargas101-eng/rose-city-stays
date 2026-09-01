import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { bookingExtensions } from "../../drizzle/schema";
import { getDb } from "../db";
import { createAndCollectExtension, quoteExtension } from "../booking-extensions";

function requestOrigin(req: { headers: Record<string, string | string[] | undefined> }) {
  const origin = req.headers.origin;
  return typeof origin === "string" && /^https:\/\//.test(origin) ? origin : "https://www.rosecitystays.com";
}

export const extensionsRouter = router({
  quote: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive(), newCheckOut: z.number().int().positive() }))
    .mutation(({ input }) => quoteExtension(input.bookingId, input.newCheckOut)),

  createAndCollect: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive(), newCheckOut: z.number().int().positive() }))
    .mutation(({ input, ctx }) => createAndCollectExtension({
      bookingId: input.bookingId,
      newCheckOut: input.newCheckOut,
      origin: requestOrigin(ctx.req),
    })),

  listForBooking: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      return db.select().from(bookingExtensions)
        .where(eq(bookingExtensions.bookingId, input.bookingId))
        .orderBy(desc(bookingExtensions.createdAt));
    }),
});
