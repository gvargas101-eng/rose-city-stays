/**
 * Public properties router — reads from the database.
 * Used by the public-facing property listing and detail pages.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, propertyPhotos, propertyAmenities } from "../../drizzle/schema";
import { eq, asc } from "drizzle-orm";

export const propertiesRouter = router({
  /** List all active properties ordered by sortOrder */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const props = await db
      .select()
      .from(properties)
      .where(eq(properties.active, 1))
      .orderBy(asc(properties.sortOrder));

    // Fetch photos and amenities for each property
    const result = await Promise.all(
      props.map(async (p) => {
        const photos = await db
          .select()
          .from(propertyPhotos)
          .where(eq(propertyPhotos.propertyId, p.id))
          .orderBy(asc(propertyPhotos.sortOrder));

        const amenities = await db
          .select()
          .from(propertyAmenities)
          .where(eq(propertyAmenities.propertyId, p.id))
          .orderBy(asc(propertyAmenities.sortOrder));

        return {
          ...p,
          photos: photos.map((ph) => ph.url),
          amenities: amenities.map((a) => a.amenity),
          image: photos[0]?.url ?? "",
        };
      })
    );

    return result;
  }),

  /** Get a single property by slug */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [prop] = await db
        .select()
        .from(properties)
        .where(eq(properties.slug, input.slug))
        .limit(1);

      if (!prop) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });

      const photos = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, prop.id))
        .orderBy(asc(propertyPhotos.sortOrder));

      const amenities = await db
        .select()
        .from(propertyAmenities)
        .where(eq(propertyAmenities.propertyId, prop.id))
        .orderBy(asc(propertyAmenities.sortOrder));

      return {
        ...prop,
        photos: photos.map((ph) => ph.url),
        amenities: amenities.map((a) => a.amenity),
        image: photos[0]?.url ?? "",
        // Derived fields for compatibility
        hostaway_url: `https://www.rosecitystays.com/listings/${prop.hostawayListingId}`,
        rating: 5.0,
        reviewCount: 0,
        highlights: [] as string[],
        priceNote: "Contact for pricing",
      };
    }),
});
