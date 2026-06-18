/**
 * Admin router — property management, photo management, amenities, bookings overview.
 * All procedures are protected and require admin role.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, propertyPhotos, propertyAmenities, bookings, siteSettings, customFees } from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { syncHostawayListings } from "../hostaway-sync";
import { generateBlogPost } from "../blog-writer";

// Helper: random suffix for file keys
function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export const adminRouter = router({
  // ── Properties ────────────────────────────────────────────────────────────

  /** List all properties (admin view — includes inactive) */
  listProperties: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(properties).orderBy(asc(properties.sortOrder));
  }),

  /** Get a single property with photos and amenities */
  getProperty: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [prop] = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (!prop) throw new TRPCError({ code: "NOT_FOUND" });

      const photos = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, input.id))
        .orderBy(asc(propertyPhotos.sortOrder));

      const amenities = await db
        .select()
        .from(propertyAmenities)
        .where(eq(propertyAmenities.propertyId, input.id))
        .orderBy(asc(propertyAmenities.sortOrder));

      return { ...prop, photos, amenities };
    }),

  /** Update property details */
  updateProperty: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
        type: z.string().optional(),
        guests: z.number().int().min(1).optional(),
        bedrooms: z.number().int().min(0).optional(),
        bathrooms: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        neighborhood: z.string().optional(),
        checkInTime: z.string().optional(),
        checkOutTime: z.string().optional(),
        cancellationPolicy: z.string().optional(),
        cleaningFee: z.string().optional(),
        active: z.number().int().min(0).max(1).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db.update(properties).set(updates).where(eq(properties.id, id));
      return { success: true };
    }),

  // ── Photos ────────────────────────────────────────────────────────────────

  /** Add a photo to a property */
  addPhoto: adminProcedure
    .input(z.object({ propertyId: z.number(), url: z.string().url() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get current max sort order
      const existing = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, input.propertyId))
        .orderBy(desc(propertyPhotos.sortOrder))
        .limit(1);

      const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
      await db.insert(propertyPhotos).values({
        propertyId: input.propertyId,
        url: input.url,
        sortOrder: nextOrder,
      });
      return { success: true };
    }),

  /** Delete a photo */
  deletePhoto: adminProcedure
    .input(z.object({ photoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(propertyPhotos).where(eq(propertyPhotos.id, input.photoId));
      return { success: true };
    }),

  /** Reorder photos */
  reorderPhotos: adminProcedure
    .input(z.object({ photos: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const photo of input.photos) {
        await db
          .update(propertyPhotos)
          .set({ sortOrder: photo.sortOrder })
          .where(eq(propertyPhotos.id, photo.id));
      }
      return { success: true };
    }),

  // ── Amenities ─────────────────────────────────────────────────────────────

  /** Add an amenity */
  addAmenity: adminProcedure
    .input(z.object({ propertyId: z.number(), amenity: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db
        .select()
        .from(propertyAmenities)
        .where(eq(propertyAmenities.propertyId, input.propertyId))
        .orderBy(desc(propertyAmenities.sortOrder))
        .limit(1);
      const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
      await db.insert(propertyAmenities).values({
        propertyId: input.propertyId,
        amenity: input.amenity,
        sortOrder: nextOrder,
      });
      return { success: true };
    }),

  /** Delete an amenity */
  deleteAmenity: adminProcedure
    .input(z.object({ amenityId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(propertyAmenities).where(eq(propertyAmenities.id, input.amenityId));
      return { success: true };
    }),

  // ── Bookings ──────────────────────────────────────────────────────────────

  /** List all bookings (most recent first) */
  listBookings: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(bookings).orderBy(desc(bookings.createdAt));
    }),

  // ── Settings ──────────────────────────────────────────────────────────────

  /** Get all site settings as a key/value map */
  getSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(siteSettings);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }),

  /** Update a site setting */
  updateSetting: adminProcedure
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .insert(siteSettings)
        .values({ key: input.key, value: input.value })
        .onDuplicateKeyUpdate({ set: { value: input.value } });
      return { success: true };
    }),

  /** Upload a photo file and return the CDN URL */
  uploadPhoto: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      fileName: z.string(),
      fileBase64: z.string(),   // base64-encoded file content
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() ?? "jpg";
      const key = `property-photos/${input.propertyId}/${randomSuffix()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Get current max sort order
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, input.propertyId))
        .orderBy(desc(propertyPhotos.sortOrder))
        .limit(1);
      const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
      await db.insert(propertyPhotos).values({
        propertyId: input.propertyId,
        url,
        sortOrder: nextOrder,
      });
      return { success: true, url };
    }),

  // ── Custom Fees ───────────────────────────────────────────────────────────

  /** List all custom fees */
  listCustomFees: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(customFees).orderBy(asc(customFees.sortOrder));
  }),

  /** Create a new custom fee */
  createCustomFee: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["flat", "percent"]),
      amount: z.string(),
      active: z.number().int().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(customFees).orderBy(desc(customFees.sortOrder)).limit(1);
      const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
      const [result] = await db.insert(customFees).values({
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        amount: input.amount,
        active: input.active ?? 1,
        sortOrder: nextOrder,
      });
      return { success: true, id: (result as any).insertId };
    }),

  /** Update a custom fee */
  updateCustomFee: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      type: z.enum(["flat", "percent"]).optional(),
      amount: z.string().optional(),
      active: z.number().int().min(0).max(1).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      await db.update(customFees).set(updates).where(eq(customFees.id, id));
      return { success: true };
    }),

  /** Delete a custom fee */
  deleteCustomFee: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(customFees).where(eq(customFees.id, input.id));
      return { success: true };
    }),

  // ── Hostaway Sync ──────────────────────────────────────────────────────────

  /** Manually trigger a Hostaway → DB sync and return the result summary */
  syncHostaway: adminProcedure.mutation(async () => {
    const result = await syncHostawayListings();
    return result;
  }),

  // ── Blog Auto-Writer ──────────────────────────────────────────────────────────

  /** Generate a new AI blog post and publish it */
  generateBlogPost: adminProcedure
    .input(z.object({ topic: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const result = await generateBlogPost(input?.topic);
      return result;
    }),

  /** List all blog posts (admin view — includes drafts) */
  listBlogPosts: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { blogPosts: blogPostsTable } = await import("../../drizzle/schema");
    const { desc: descOrder } = await import("drizzle-orm");
    const rows = await db.select().from(blogPostsTable).orderBy(descOrder(blogPostsTable.publishedAt));
    return rows.map(r => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : [] }));
  }),

  /** Toggle a blog post published/draft */
  toggleBlogPost: adminProcedure
    .input(z.object({ id: z.number(), published: z.number().int().min(0).max(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { blogPosts: blogPostsTable } = await import("../../drizzle/schema");
      await db.update(blogPostsTable).set({ published: input.published }).where(eq(blogPostsTable.id, input.id));
      return { success: true };
    }),

  /** Delete a blog post */
  deleteBlogPost: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { blogPosts: blogPostsTable } = await import("../../drizzle/schema");
      await db.delete(blogPostsTable).where(eq(blogPostsTable.id, input.id));
      return { success: true };
    }),

  /** Update booking status */
  updateBookingStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "paid", "confirmed", "cancelled", "failed"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(bookings)
        .set({ status: input.status })
        .where(eq(bookings.id, input.id));
      return { success: true };
    }),
});
