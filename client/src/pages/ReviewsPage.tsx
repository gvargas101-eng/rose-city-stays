import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";
import { generateBreadcrumbSchema } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star } from "lucide-react";
import { Link } from "wouter";

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${cls} ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function propertyLabel(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function ReviewsPage() {
  useSEO(
    {
      title: "Guest Reviews | Rose City Stays — Tyler, TX Rentals",
      description:
        "Read verified guest reviews for Rose City Stays properties in Tyler, TX. 4.9★ average across 10 premium short-term rentals.",
      ogType: "website",
      path: "/reviews",
      keywords: [
        "Rose City Stays reviews",
        "Tyler TX rental reviews",
        "short-term rental guest reviews",
        "Tyler Texas vacation rental reviews",
      ],
    },
    generateBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Guest Reviews", path: "/reviews" },
    ])
  );
  const { data: reviews = [], isLoading } = trpc.reviews.all.useQuery();
  const [filterSlug, setFilterSlug] = useState("all");

  // Build unique property list from reviews
  const propertySlugs = Array.from(new Set(reviews.map(r => r.propertySlug))).sort();

  const filtered = filterSlug === "all" ? reviews : reviews.filter(r => r.propertySlug === filterSlug);

  // Aggregate stats
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>
            What Our Guests Say
          </span>
          <h1 className="text-4xl lg:text-5xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Guest Reviews
          </h1>
          {avgRating && (
            <div className="flex items-center gap-2 mt-2">
              <StarRow rating={Math.round(parseFloat(avgRating))} size="lg" />
              <span className="text-2xl font-light text-foreground">{avgRating}</span>
              <span className="text-muted-foreground text-sm">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          )}
          <div className="w-16 h-px bg-primary mt-4" />
        </div>

        {/* Property filter */}
        {propertySlugs.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilterSlug("all")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${filterSlug === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
            >
              All Properties
            </button>
            {propertySlugs.map(slug => (
              <button
                key={slug}
                onClick={() => setFilterSlug(slug)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${filterSlug === slug ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
              >
                {propertyLabel(slug)}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20 text-muted-foreground">Loading reviews…</div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl font-light text-muted-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              No reviews yet
            </p>
            <p className="text-sm text-muted-foreground">Be the first to share your experience!</p>
            <Link href="/leave-a-review">
              <button className="mt-6 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Leave a Review
              </button>
            </Link>
          </div>
        )}

        {/* Review cards */}
        <div className="space-y-6">
          {filtered.map(review => (
            <div key={review.id} className="border border-border rounded-xl p-6 bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{review.guestName}</span>
                    <StarRow rating={review.rating} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {propertyLabel(review.propertySlug)} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
                    })}
                  </div>
                </div>
              </div>

              {review.title && (
                <p className="font-medium text-foreground mb-2">{review.title}</p>
              )}
              <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{review.body}</p>

              {/* Host response */}
              {review.hostResponse && (
                <div className="mt-4 bg-muted/40 border border-border/50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Response from Host</p>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{review.hostResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isLoading && filtered.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">Stayed with us recently?</p>
            <Link href="/leave-a-review">
              <button className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Leave a Review
              </button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
