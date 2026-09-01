import { z } from "zod";
import { blogPosts } from "../drizzle/schema";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { eq } from "drizzle-orm";

export const localEventsDraftSchema = z.object({
  title: z.string().trim().min(30).max(100),
  excerpt: z.string().trim().min(80).max(600),
  content: z.string().trim().min(800).max(20_000),
  metaDescription: z.string().trim().min(50).max(160),
  tags: z.array(z.string().trim().min(2).max(40)).min(4).max(8),
  periodLabel: z.string().trim().min(8).max(64),
  sourceUrls: z.array(z.string().url()).min(3).max(12),
});

export type LocalEventsDraftInput = z.infer<typeof localEventsDraftSchema>;

export function toLocalEventsSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 110);
}

export function estimateLocalEventsReadTime(content: string): number {
  return Math.max(3, Math.round(content.trim().split(/\s+/).length / 200));
}

async function uniqueSlug(baseSlug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const [existing] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix++}`;
  }
}

export async function createLocalEventsDraft(rawInput: LocalEventsDraftInput) {
  const input = localEventsDraftSchema.parse(rawInput);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const slug = await uniqueSlug(toLocalEventsSlug(input.title));
  const newsContext = [
    `Period: ${input.periodLabel}`,
    "Verified sources:",
    ...input.sourceUrls.map((url) => `- ${url}`),
  ].join("\n");

  const [inserted] = await db.insert(blogPosts).values({
    slug,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    featuredImage: null,
    author: "Rose City Stays",
    category: "Events",
    tags: JSON.stringify(input.tags),
    metaDescription: input.metaDescription,
    readTime: estimateLocalEventsReadTime(input.content),
    published: 0,
    aiGenerated: 1,
    newsContext,
  }).$returningId();

  await notifyOwner({
    title: "New Tyler Events Blog Draft Ready",
    content: `“${input.title}” is saved as a draft for ${input.periodLabel}. Review and publish it in Admin → Settings → Blog Management.`,
  }).catch(() => false);

  return { id: inserted.id, slug, title: input.title, published: false };
}
