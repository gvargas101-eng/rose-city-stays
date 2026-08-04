import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { reviews } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { adminProcedure } from "../_core/trpc";

export const reviewsRouter = router({
  // ─── Public: get visible reviews for a specific property ───────────────────
  byProperty: publicProcedure
    .input(z.object({ propertySlug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.propertySlug, input.propertySlug), eq(reviews.isVisible, 1)))
        .orderBy(desc(reviews.createdAt));
      return rows.map(r => ({
        id: r.id,
        propertySlug: r.propertySlug,
        guestName: r.guestName,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body,
        hostResponse: r.hostResponse ?? null,
        createdAt: r.createdAt,
      }));
    }),

  // ─── Public: get all visible reviews (for the /reviews page) ───────────────
  all: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.isVisible, 1))
      .orderBy(desc(reviews.createdAt));
    return rows.map(r => ({
      id: r.id,
      propertySlug: r.propertySlug,
      guestName: r.guestName,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body,
      hostResponse: r.hostResponse ?? null,
      createdAt: r.createdAt,
    }));
  }),

  // ─── Public: submit a review ────────────────────────────────────────────────
  submit: publicProcedure
    .input(
      z.object({
        propertySlug: z.string().min(1),
        guestName: z.string().min(1).max(128),
        guestEmail: z.string().email().optional(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(256).optional(),
        body: z.string().min(10).max(4000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(reviews).values({
        propertySlug: input.propertySlug,
        guestName: input.guestName,
        guestEmail: input.guestEmail ?? null,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body,
        isVisible: 1,
      });
      return { success: true };
    }),

  // ─── Admin: list ALL reviews (visible + hidden) ─────────────────────────────
  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    return rows;
  }),

  // ─── Admin: delete a review ──────────────────────────────────────────────────
  adminDelete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(reviews).where(eq(reviews.id, input.id));
      return { success: true };
    }),

  // ─── Admin: respond to a review (host response) ─────────────────────────────
  adminRespond: adminProcedure
    .input(z.object({ id: z.number().int(), hostResponse: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(reviews)
        .set({ hostResponse: input.hostResponse })
        .where(eq(reviews.id, input.id));
      return { success: true };
    }),

  // ─── Admin: toggle review visibility ────────────────────────────────────────
  adminToggleVisibility: adminProcedure
    .input(z.object({ id: z.number().int(), isVisible: z.number().int().min(0).max(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(reviews)
        .set({ isVisible: input.isVisible })
        .where(eq(reviews.id, input.id));
      return { success: true };
    }),
});
