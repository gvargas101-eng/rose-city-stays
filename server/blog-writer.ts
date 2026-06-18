/**
 * AI Blog Writer
 *
 * Searches for current Tyler, TX news and events, then uses the built-in LLM
 * to write an SEO-optimized blog post and saves it to the blog_posts table.
 *
 * Topics rotate through a set of evergreen + timely categories relevant to
 * Rose City Stays' audience: travelers, medical professionals, relocators,
 * corporate guests, and event visitors.
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { blogPosts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Topic rotation ────────────────────────────────────────────────────────────

const TOPIC_CATEGORIES = [
  "Tyler TX events and festivals",
  "Tyler TX restaurants and dining",
  "Tyler TX healthcare and medical travel",
  "Tyler TX outdoor activities and parks",
  "Tyler TX arts and culture",
  "Tyler TX real estate and relocation",
  "Tyler TX sports and recreation",
  "Tyler TX business and corporate travel",
  "Tyler TX family activities",
  "East Texas travel guide",
];

function pickTopic(): string {
  // Rotate based on current week number so it's deterministic but varied
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return TOPIC_CATEGORIES[weekNum % TOPIC_CATEGORIES.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(3, Math.round(words / 200));
}

async function ensureUniqueSlug(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  base: string
): Promise<string> {
  let slug = base;
  let attempt = 2;
  while (true) {
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    if (!existing) break;
    slug = `${base}-${attempt++}`;
  }
  return slug;
}

// ── Main function ─────────────────────────────────────────────────────────────

export interface BlogWriteResult {
  success: boolean;
  postId?: number;
  title?: string;
  slug?: string;
  error?: string;
}

export async function generateBlogPost(topicOverride?: string): Promise<BlogWriteResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const topic = topicOverride || pickTopic();
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  try {
    // ── Step 1: Research phase — ask LLM to act as a researcher ──────────────
    const researchResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a local content researcher for Rose City Stays, a short-term rental company in Tyler, Texas. 
Your job is to identify 3-5 specific, current, and interesting facts, events, or developments related to the given topic in Tyler, TX.
Focus on things that would be relevant to visitors, medical professionals, corporate travelers, or people relocating to Tyler.
Be specific — mention real places, real events, real institutions. Today is ${today}.
Return a JSON object with: { "topic": string, "keyPoints": string[], "angle": string }
where "angle" is the specific story angle for the blog post.`,
        },
        {
          role: "user",
          content: `Research topic: "${topic}" in Tyler, TX for ${today}. What are the most interesting and relevant points for someone visiting or staying in Tyler?`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "research_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              topic: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              angle: { type: "string" },
            },
            required: ["topic", "keyPoints", "angle"],
            additionalProperties: false,
          },
        },
      },
    });

    const researchRaw = (researchResponse.choices?.[0]?.message?.content as string) ?? "{}";
    const research = JSON.parse(researchRaw);
    const newsContext = `Topic: ${research.topic}\nAngle: ${research.angle}\nKey points:\n${(research.keyPoints as string[]).map((p: string) => `- ${p}`).join("\n")}`;

    // ── Step 2: Write the full blog post ─────────────────────────────────────
    const writeResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert travel and lifestyle blogger writing for Rose City Stays, Tyler Texas's premier short-term rental company.

Write SEO-optimized blog posts that:
- Are genuinely helpful and informative for visitors, medical professionals, corporate travelers, and relocators
- Naturally mention Rose City Stays as the ideal accommodation option (but not in every paragraph — keep it editorial)
- Include specific Tyler, TX locations, neighborhoods, and landmarks
- Are warm, welcoming, and locally knowledgeable in tone
- Use proper Markdown formatting with ## headers, bullet points where appropriate, and natural paragraph flow

Return a JSON object with:
{
  "title": string (compelling, SEO-friendly, 50-70 chars),
  "metaDescription": string (155-160 chars, includes "Tyler TX" and a CTA),
  "excerpt": string (2-3 sentences, engaging summary),
  "category": string (one of: "Tyler, TX" | "Healthcare" | "Events" | "Dining" | "Outdoors" | "Relocation" | "Travel Tips"),
  "tags": string[] (4-6 relevant tags),
  "content": string (full Markdown blog post, 600-900 words)
}`,
        },
        {
          role: "user",
          content: `Write a blog post for Rose City Stays based on this research:\n\n${newsContext}\n\nToday's date: ${today}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "blog_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              metaDescription: { type: "string" },
              excerpt: { type: "string" },
              category: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              content: { type: "string" },
            },
            required: ["title", "metaDescription", "excerpt", "category", "tags", "content"],
            additionalProperties: false,
          },
        },
      },
    });

    const postRaw = (writeResponse.choices?.[0]?.message?.content as string) ?? "{}";
    const post = JSON.parse(postRaw);

    // ── Step 3: Save to database ──────────────────────────────────────────────
    const baseSlug = toSlug(post.title);
    const slug = await ensureUniqueSlug(db, baseSlug);
    const readTime = estimateReadTime(post.content);

    const [inserted] = await db.insert(blogPosts).values({
      slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: null,
      author: "Rose City Stays",
      category: post.category ?? "Tyler, TX",
      tags: JSON.stringify(post.tags ?? []),
      metaDescription: post.metaDescription,
      readTime,
      published: 1,
      aiGenerated: 1,
      newsContext,
    }).$returningId();

    return {
      success: true,
      postId: inserted.id,
      title: post.title,
      slug,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
