/**
 * Blog router — public procedures for listing and reading blog posts.
 * Posts are stored in the blog_posts table and can be AI-generated or manually written.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { blogPosts } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const blogRouter = router({
  /** List all published blog posts, newest first */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(20),
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.published, 1))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(input?.limit ?? 20);

      return rows.map((r) => ({
        ...r,
        tags: r.tags ? JSON.parse(r.tags) : [],
      }));
    }),

  /** Get a single published post by slug */
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, input.slug), eq(blogPosts.published, 1)))
        .limit(1);

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      };
    }),

  /** Get the 3 most recent posts for the homepage preview */
  recent: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.published, 1))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(3);

    return rows.map((r) => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));
  }),
});
