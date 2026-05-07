import { useState } from "react";
import { Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Review } from "@/lib/reviews";

interface ReviewsSectionProps {
  reviews: Review[];
  propertyName: string;
}

function StarRating({ rating, max = 10 }: { rating: number; max?: number }) {
  // Normalize to 5-star scale
  const normalized = max === 10 ? rating / 2 : rating;
  const full = Math.floor(normalized);
  const half = normalized - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
      {half && (
        <span className="relative w-3.5 h-3.5">
          <Star className="absolute inset-0 w-3.5 h-3.5 text-amber-400" />
          <Star
            className="absolute inset-0 w-3.5 h-3.5 fill-amber-400 text-amber-400"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          />
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-3.5 h-3.5 text-amber-300" />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 220;
  const displayText = isLong && !expanded ? review.text.slice(0, 220) + "…" : review.text;

  // Normalize rating for display
  const displayRating = review.rating > 5 ? (review.rating / 2).toFixed(1) : review.rating.toFixed(1);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar initials */}
          <div
            className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {review.reviewerName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm leading-tight" style={{ fontFamily: "var(--font-body)" }}>
              {review.reviewerName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
              {review.date}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating rating={review.rating} max={review.rating > 5 ? 10 : 5} />
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {displayRating} / 5
          </span>
        </div>
      </div>

      {/* Quote icon + text */}
      <div className="relative">
        <Quote className="absolute -top-1 -left-1 w-4 h-4 text-primary/20" />
        <p
          className="text-sm text-muted-foreground leading-relaxed pl-4"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:text-primary/80 mt-1 pl-4 underline underline-offset-2 transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Channel badge */}
      {review.channel && review.channel !== "Direct" && (
        <div className="flex justify-end">
          <span
            className="text-xs text-muted-foreground/60 border border-border/50 rounded-full px-2 py-0.5"
            style={{ fontFamily: "var(--font-body)" }}
          >
            via {review.channel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection({ reviews, propertyName }: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (!reviews || reviews.length === 0) return null;

  const INITIAL_COUNT = 6;
  const displayed = showAll ? reviews : reviews.slice(0, INITIAL_COUNT);

  // Compute aggregate rating (normalize all to 5-star scale)
  const normalized = reviews.map((r) => (r.rating > 5 ? r.rating / 2 : r.rating));
  const avgRating = normalized.reduce((a, b) => a + b, 0) / normalized.length;

  return (
    <section className="py-10 border-t border-border">
      {/* Section header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StarRating rating={avgRating} max={5} />
            <span
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {avgRating.toFixed(2)}
            </span>
          </div>
          <p
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {reviews.length} verified guest review{reviews.length !== 1 ? "s" : ""} for {propertyName}
          </p>
        </div>
      </div>

      {/* Reviews grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Show more / less */}
      {reviews.length > INITIAL_COUNT && (
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="rounded-full px-6"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {showAll
              ? "Show fewer reviews"
              : `Show all ${reviews.length} reviews`}
          </Button>
        </div>
      )}
    </section>
  );
}
