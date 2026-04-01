// Rose City Stays Blog Page
// Design: Rose City Luxe — blog listing with featured articles

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllBlogArticles, getBlogArticlesByCategory } from "@/lib/blog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar, Clock, Tag } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

export default function Blog() {
  const articles = getAllBlogArticles();
  const categories = Array.from(new Set(articles.map((a) => a.category)));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useSEO({
    title: "Blog | Rose City Stays - Tyler, TX Travel & Living Guide",
    description:
      "Discover Tyler, Texas through our blog. Read about local attractions, healthcare opportunities, events, and tips for visiting or relocating to the Rose City.",
    keywords: [
      "Tyler TX blog",
      "Rose City guide",
      "Tyler attractions",
      "Tyler events",
      "East Texas travel",
    ],
  });

  const filteredArticles = selectedCategory
    ? articles.filter((a) => a.category === selectedCategory)
    : articles;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 px-4 bg-gradient-to-br from-background to-muted">
          <div className="container max-w-4xl">
            <p
              className="text-sm font-medium tracking-widest uppercase text-primary mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Rose City Insights
            </p>
            <h1
              className="text-4xl lg:text-5xl font-light mb-4 text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Discover Tyler
            </h1>
            <p
              className="text-lg text-muted-foreground max-w-2xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Explore Tyler's attractions, healthcare opportunities, events, and everything that makes the Rose City special. Your guide to living and visiting East Texas.
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 px-4 border-b border-border">
          <div className="container max-w-6xl">
            <div className="flex flex-wrap gap-3">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className="rounded-full"
                style={{ fontFamily: "var(--font-body)" }}
              >
                All Articles
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16 px-4">
          <div className="container max-w-6xl">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                  No articles found in this category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                  <Link key={article.id} href={`/blog/${article.slug}`}>
                    <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow cursor-pointer property-card">
                      {/* Featured Image */}
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <CardContent className="p-6">
                        {/* Category Badge */}
                        <div className="mb-3">
                          <span className="badge-mauve">{article.category}</span>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-xl font-light mb-2 line-clamp-2 text-foreground"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {article.title}
                        </h3>

                        {/* Excerpt */}
                        <p
                          className="text-sm text-muted-foreground mb-4 line-clamp-2"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {article.excerpt}
                        </p>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span style={{ fontFamily: "var(--font-body)" }}>
                              {new Date(article.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span style={{ fontFamily: "var(--font-body)" }}>
                              {article.readTime} min read
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {article.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded"
                              style={{ fontFamily: "var(--font-body)" }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Read More Link */}
                        <div className="text-primary text-sm font-medium flex items-center gap-2">
                          Read Article
                          <span>→</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5 border-t border-border">
          <div className="container max-w-4xl text-center">
            <h2
              className="text-3xl font-light mb-4 text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Experience Tyler?
            </h2>
            <p
              className="text-lg text-muted-foreground mb-8"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Book a stay at Rose City Stays and explore everything the Rose City has to offer.
            </p>
            <Link href="/#properties">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
                Browse Properties
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
