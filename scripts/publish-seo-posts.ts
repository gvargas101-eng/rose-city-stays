/**
 * Publishes two targeted SEO blog posts to the DB:
 * 1. "Short-Term Rentals Tyler TX" — high-intent search term
 * 2. "Furnished Housing Tyler TX Medical" — travel nurse / healthcare professional audience
 */

import { invokeLLM } from "../server/_core/llm";
import { getDb } from "../server/db";
import { blogPosts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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

const POSTS = [
  {
    systemPrompt: `You are an expert travel and lifestyle blogger writing for Rose City Stays, Tyler Texas's premier short-term rental company. Write a highly SEO-optimized blog post targeting the exact search phrase "short-term rentals Tyler TX". The post must:
- Use "short-term rentals Tyler TX" naturally in the title, first paragraph, and at least 2 subheadings
- Be genuinely helpful: explain what makes Tyler TX a great destination, what to look for in a short-term rental, and why booking direct saves money vs Airbnb/VRBO
- Mention specific Tyler TX neighborhoods (Hollytree, Hospital District, downtown), landmarks (Rose Garden, Caldwell Zoo, UT Health, Mother Frances), and events (Azalea Trail, Texas Rose Festival)
- Mention Rose City Stays as the best option for short-term rentals in Tyler TX (but editorially, not as an ad)
- Be warm, locally knowledgeable, and helpful in tone
- Use proper Markdown with ## headers and natural paragraph flow
Return a JSON object with: { "title": string, "metaDescription": string, "excerpt": string, "category": string, "tags": string[], "content": string }
- title: 50-65 chars, must include "Short-Term Rentals Tyler TX"
- metaDescription: 150-160 chars, must include "short-term rentals Tyler TX" and a CTA
- excerpt: 2-3 sentences
- category: "Tyler, TX"
- tags: 5-6 tags including "short-term rentals Tyler TX", "Tyler Texas vacation rental", "Tyler TX Airbnb alternative"
- content: 700-950 words of Markdown`,
    userPrompt: `Write the blog post about short-term rentals in Tyler TX. Include these specific facts:
- Tyler TX has 536 active short-term rental listings on Airbnb/VRBO/Booking.com as of 2026 (AirDNA data)
- Average daily rate is $137, average occupancy 54%
- Rose City Stays has 11 properties in Tyler TX with a 4.9-star average rating
- Key Tyler TX hospitals: CHRISTUS Mother Frances (402-bed acute care), UT Health Tyler, UT Health East Texas (expanding with new School of Medicine building opening 2026)
- Popular Tyler TX attractions: Tyler Rose Garden (largest in US), Caldwell Zoo, Tyler State Park, Azalea Trail, Texas Rose Festival (October)
- Hollytree neighborhood: upscale, near Hollytree Country Club, quiet and residential
- Hospital District: walking distance to CHRISTUS Mother Frances and UT Health Tyler
- Downtown Tyler: restaurants, shops, historic district, Stanley's Famous Pit Bar-B-Q
Today's date: August 2026`,
  },
  {
    systemPrompt: `You are an expert travel and lifestyle blogger writing for Rose City Stays, Tyler Texas's premier short-term rental company. Write a highly SEO-optimized blog post targeting the exact search phrases "furnished housing Tyler TX medical" and "travel nurse housing Tyler TX". The post must:
- Use "furnished housing Tyler TX" and "travel nurse housing Tyler TX" naturally in the title, first paragraph, and subheadings
- Be genuinely helpful for travel nurses and medical professionals: explain what to look for in furnished housing, why Tyler TX is a great assignment city, what the hospitals are like, and how to find the best housing
- Mention specific Tyler TX hospitals and healthcare facilities with real details
- Explain the advantages of short-term rental homes over extended-stay hotels for medical professionals (full kitchen, laundry, workspace, privacy, faster WiFi)
- Mention Rose City Stays as the ideal furnished housing option for medical professionals in Tyler TX
- Be warm, professional, and locally knowledgeable in tone
- Use proper Markdown with ## headers and natural paragraph flow
Return a JSON object with: { "title": string, "metaDescription": string, "excerpt": string, "category": string, "tags": string[], "content": string }
- title: 50-65 chars, must include "Furnished Housing Tyler TX" or "Travel Nurse Housing Tyler TX"
- metaDescription: 150-160 chars, must include "furnished housing Tyler TX" and a CTA
- excerpt: 2-3 sentences
- category: "Healthcare"
- tags: 5-6 tags including "travel nurse housing Tyler TX", "furnished housing Tyler TX medical", "Tyler TX healthcare housing", "short-term rental Tyler TX"
- content: 700-950 words of Markdown`,
    userPrompt: `Write the blog post about furnished housing for medical professionals in Tyler TX. Include these specific facts:
- CHRISTUS Mother Frances Hospital Tyler: 402-bed acute care facility at 800 E Dawson St, Tyler TX 75701. Major travel nurse employer. Pay rates up to $3,344/week for travel nurses.
- UT Health Tyler: Major hospital system, expanding with new UT Tyler School of Medicine building opening 2026
- UT Health East Texas: $25 million expansion announced 2025, adding 30 patient rooms to medical/surgical unit on 7th floor
- New UT Health East Texas Behavioral Health facility expected to open in Tyler in 2026 (partnership with Oceans Healthcare)
- 274 travel nurse jobs available in Tyler TX area (Indeed data)
- Travel nurse housing platform travelnursehousing.com lists 157 furnished rentals in Tyler TX area
- Rose City Stays has 11 fully furnished properties in Tyler TX, including properties in the Hospital District (walking distance to Mother Frances and UT Health Tyler)
- Rose City Stays amenities: 1 Gig WiFi (essential for telehealth/charting), full kitchens, in-unit laundry, self check-in, 4.9-star rated
- Tyler TX is in East Texas, a growing healthcare hub serving a region of 1+ million people
Today's date: August 2026`,
  },
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database unavailable");
    process.exit(1);
  }

  for (let i = 0; i < POSTS.length; i++) {
    const { systemPrompt, userPrompt } = POSTS[i];
    console.log(`\n[${i + 1}/${POSTS.length}] Generating blog post...`);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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

    const raw = (response.choices?.[0]?.message?.content as string) ?? "{}";
    const post = JSON.parse(raw);

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
      newsContext: userPrompt,
    }).$returningId();

    console.log(`✓ Published: "${post.title}"`);
    console.log(`  Slug: /blog/${slug}`);
    console.log(`  ID: ${inserted.id}`);
    console.log(`  Read time: ${readTime} min`);
    console.log(`  Tags: ${post.tags.join(", ")}`);
  }

  console.log("\n✓ All posts published successfully.");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
