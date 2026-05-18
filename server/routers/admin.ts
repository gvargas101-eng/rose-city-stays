/**
 * Admin router — property management, photo management, amenities, bookings overview.
 * All procedures are protected and require admin role.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, propertyPhotos, propertyAmenities, bookings } from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";

// Middleware: require admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

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
