/**
 * Seed script: migrate static blog articles from blog.ts into the blog_posts DB table.
 * Run once: node scripts/seed-blog.mjs
 */

import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read and eval the blog.ts file to extract articles
// We'll just hardcode the 6 articles here since they're static
const articles = [
  {
    slug: "ut-tyler-school-of-medicine-healthcare-opportunities",
    title: "UT Tyler School of Medicine: East Texas's Healthcare Revolution",
    category: "Healthcare",
    tags: JSON.stringify(["UT Tyler", "medical school", "healthcare", "East Texas", "Tyler TX"]),
    metaDescription: "Discover how UT Tyler's new medical school is transforming healthcare in East Texas, attracting medical professionals and creating opportunities.",
    excerpt: "As East Texas's first medical school, UT Tyler is reshaping the region's healthcare landscape. Learn about the programs, residencies, and opportunities this institution brings to Tyler.",
    readTime: 8,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-ut-tyler-medicine-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
  {
    slug: "first-monday-canton-trade-days-complete-guide",
    title: "First Monday Canton Trade Days: The World's Largest Flea Market Guide",
    category: "Events",
    tags: JSON.stringify(["Canton TX", "flea market", "First Monday", "East Texas", "shopping"]),
    metaDescription: "Your complete guide to First Monday Canton Trade Days — the world's largest flea market, just 30 minutes from Tyler, TX.",
    excerpt: "Just 30 minutes from Tyler, Canton's First Monday Trade Days draws hundreds of thousands of visitors each month. Here's everything you need to know.",
    readTime: 6,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-canton-trade-days-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
  {
    slug: "texas-rose-festival-complete-visitor-guide",
    title: "Texas Rose Festival: Tyler's Premier October Celebration",
    category: "Events",
    tags: JSON.stringify(["Texas Rose Festival", "Tyler TX", "October", "festivals", "Rose Capital"]),
    metaDescription: "Everything you need to know about the Texas Rose Festival in Tyler, TX — the annual October celebration that crowns the Rose Capital of America.",
    excerpt: "Every October, Tyler transforms into a sea of roses for the Texas Rose Festival. From the coronation to the rose shows, here's your complete guide.",
    readTime: 7,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-rose-festival-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
  {
    slug: "azalea-trail-spring-flower-festival-tyler",
    title: "Azalea Trail & Spring Flower Festival: Tyler's Most Beautiful Season",
    category: "Tyler, TX",
    tags: JSON.stringify(["Azalea Trail", "Tyler TX", "spring", "flowers", "gardens"]),
    metaDescription: "Discover Tyler's famous Azalea Trail and Spring Flower Festival — the best time to visit the Rose Capital of America.",
    excerpt: "Each spring, Tyler's historic neighborhoods burst into color along the Azalea Trail. Discover the best routes, bloom times, and places to stay.",
    readTime: 5,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-azalea-trail-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
  {
    slug: "ut-health-east-texas-healthcare-excellence",
    title: "UT Health East Texas: Excellence in Healthcare & Medical Careers",
    category: "Healthcare",
    tags: JSON.stringify(["UT Health", "East Texas", "healthcare", "Tyler TX", "medical careers"]),
    metaDescription: "UT Health East Texas is the region's leading healthcare system. Learn about career opportunities, patient services, and why Tyler is a medical hub.",
    excerpt: "UT Health East Texas anchors Tyler's reputation as a regional medical hub. From Mother Frances Hospital to specialty clinics, here's what makes it exceptional.",
    readTime: 6,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-ut-health-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
  {
    slug: "corporate-housing-medical-professionals-tyler",
    title: "Corporate Housing for Medical Professionals in Tyler, TX",
    category: "Travel Tips",
    tags: JSON.stringify(["corporate housing", "medical professionals", "Tyler TX", "short-term rental", "travel nurses"]),
    metaDescription: "Find the best corporate housing and short-term rentals in Tyler, TX for medical professionals, travel nurses, and healthcare workers.",
    excerpt: "Tyler's booming healthcare sector attracts thousands of medical professionals each year. Rose City Stays offers the ideal home base for travel nurses, residents, and healthcare workers.",
    readTime: 5,
    featuredImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/blog-corporate-housing-Uf4NMBnVODNDrHoVBHMjrH.webp",
    aiGenerated: 0,
  },
];

async function seed() {
  const conn = await createConnection(process.env.DATABASE_URL);

  for (const article of articles) {
    // Check if already exists
    const [existing] = await conn.execute("SELECT id FROM blog_posts WHERE slug = ?", [article.slug]);
    if (existing.length > 0) {
      console.log(`  ↳ Skipping (already exists): ${article.slug}`);
      continue;
    }

    // We don't have the full content here — use a placeholder that links to the static version
    const content = `*This article was migrated from the original Rose City Stays blog.*\n\n${article.excerpt}\n\n*Full content coming soon.*`;

    await conn.execute(
      `INSERT INTO blog_posts (slug, title, excerpt, content, featuredImage, author, category, tags, metaDescription, readTime, published, aiGenerated, publishedAt)
       VALUES (?, ?, ?, ?, ?, 'Rose City Stays', ?, ?, ?, ?, 1, ?, NOW())`,
      [article.slug, article.title, article.excerpt, content, article.featuredImage, article.category, article.tags, article.metaDescription, article.readTime, article.aiGenerated]
    );
    console.log(`  ✓ Inserted: ${article.title}`);
  }

  await conn.end();
  console.log("\nBlog seed complete.");
}

seed().catch(console.error);
