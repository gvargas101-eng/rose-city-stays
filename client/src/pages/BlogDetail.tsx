// Rose City Stays Blog Detail Page
// Design: Rose City Luxe — individual blog post with related content

import { useRoute } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBlogArticleBySlug, getRelatedArticles } from "@/lib/blog";
import { getPropertyById } from "@/lib/properties";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";
import { Streamdown } from "streamdown";
import { useSEO } from "@/hooks/useSEO";
import { generateArticleSchema } from "@/lib/seo";

export default function BlogDetail() {
  const [match, params] = useRoute("/blog/:slug");

  if (!match) {
    return null;
  }

  const article = getBlogArticleBySlug(params?.slug as string);

  useSEO(
    {
      title: `${article?.title} | Rose City Stays Blog`,
      description: article?.metaDescription || article?.excerpt || "",
      ogImage: article?.featuredImage,
      keywords: article?.tags,
    },
    article
      ? generateArticleSchema({
          title: article.title,
          description: article.excerpt,
          image: article.featuredImage,
          author: article.author,
          datePublished: article.date,
          url: `https://rosecitystays.com/blog/${article.slug}`,
        })
      : undefined
  );

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-3xl font-light mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Article Not Found
            </h1>
            <Link href="/blog">
              <Button className="bg-primary text-primary-foreground rounded-full">
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedArticles = getRelatedArticles(article.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Back Button */}
        <div className="py-6 px-4 border-b border-border">
          <div className="container max-w-4xl">
            <Link href="/blog">
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Image */}
        <div className="w-full aspect-video bg-muted overflow-hidden">
          <img
            src={article.featuredImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article Header */}
        <section className="py-12 px-4 border-b border-border">
          <div className="container max-w-4xl">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="badge-mauve">{article.category}</span>
            </div>

            {/* Title */}
            <h1
              className="text-4xl lg:text-5xl font-light mb-6 text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {article.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>
                  {new Date(article.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span style={{ fontFamily: "var(--font-body)" }}>{article.readTime} min read</span>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-12 px-4">
          <div className="container max-w-4xl">
            <div
              className="prose prose-sm max-w-none"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <Streamdown>{article.content}</Streamdown>
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="py-8 px-4 border-t border-border">
          <div className="container max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 bg-muted text-muted-foreground rounded-full"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Related Properties */}
        {article.relatedProperties.length > 0 && (
          <section className="py-12 px-4 bg-muted/30 border-t border-border">
            <div className="container max-w-4xl">
              <h2
                className="text-2xl font-light mb-8 text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Perfect Properties for This Experience
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {article.relatedProperties
                  .map((propId) => getPropertyById(propId))
                  .filter((p) => p !== undefined)
                  .map((property) => (
                    <Link key={property!.id} href={`/property/${property!.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer property-card h-full">
                        <div className="aspect-video overflow-hidden bg-muted">
                          <img
                            src={property!.image}
                            alt={property!.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3
                            className="font-light text-lg mb-2"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {property!.shortName}
                          </h3>
                          <p
                            className="text-sm text-muted-foreground mb-4"
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            {property!.shortDescription}
                          </p>
                          <Button
                            variant="outline"
                            className="w-full rounded-full"
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            View Property
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-12 px-4 border-t border-border">
            <div className="container max-w-4xl">
              <h2
                className="text-2xl font-light mb-8 text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <Link key={relatedArticle.id} href={`/blog/${relatedArticle.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer property-card h-full">
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img
                          src={relatedArticle.featuredImage}
                          alt={relatedArticle.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <span className="badge-mauve text-xs mb-2 inline-block">
                          {relatedArticle.category}
                        </span>
                        <h3
                          className="font-light text-lg mb-2 line-clamp-2"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {relatedArticle.title}
                        </h3>
                        <p
                          className="text-sm text-muted-foreground"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {relatedArticle.readTime} min read
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5 border-t border-border">
          <div className="container max-w-4xl text-center">
            <h2
              className="text-3xl font-light mb-4 text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Visit Tyler?
            </h2>
            <p
              className="text-lg text-muted-foreground mb-8"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Book a stay at Rose City Stays and experience everything this article covers.
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
