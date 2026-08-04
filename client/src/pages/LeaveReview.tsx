import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, CheckCircle2 } from "lucide-react";
import { useSearch } from "wouter";

const PROPERTIES = [
  { slug: "hollytree-golf-dining", name: "Hollytree Golf & Dining" },
  { slug: "hollytree-townhouse", name: "Hollytree Townhouse" },
  { slug: "hollytree-king", name: "Hollytree King" },
  { slug: "noir-at-hollytree", name: "Noir at Hollytree" },
  { slug: "the-briar", name: "The Briar" },
  { slug: "azalea-cottage", name: "Azalea Cottage" },
  { slug: "green-acres", name: "Green Acres" },
  { slug: "legacy-house", name: "Legacy House" },
  { slug: "the-alamo-house", name: "The Alamo House" },
  { slug: "wall-ave-retreat", name: "Wall Ave. Retreat" },
  { slug: "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys", name: "Cozy 3 Bedrooms (Hospital District)" },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="focus:outline-none"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

export default function LeaveReview() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefilledSlug = params.get("property") ?? "";

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    propertySlug: prefilledSlug,
    guestName: "",
    guestEmail: "",
    rating: 0,
    title: "",
    body: "",
  });

  const submitMutation = trpc.reviews.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit review. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertySlug) return toast.error("Please select a property.");
    if (!form.guestName.trim()) return toast.error("Please enter your name.");
    if (form.rating === 0) return toast.error("Please select a star rating.");
    if (form.body.trim().length < 10) return toast.error("Please write at least 10 characters in your review.");

    submitMutation.mutate({
      propertySlug: form.propertySlug,
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim() || undefined,
      rating: form.rating,
      title: form.title.trim() || undefined,
      body: form.body.trim(),
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-24 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Thank You!
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Your review has been submitted and will appear on our website shortly. We truly appreciate you sharing your experience with us.
          </p>
          <a href="/reviews">
            <Button className="mt-8 rounded-full px-8">View All Reviews</Button>
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-8">
          <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>
            Share Your Experience
          </span>
          <h1 className="text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Leave a Review
          </h1>
          <div className="w-16 h-px bg-primary mt-4" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Property *</label>
            <select
              value={form.propertySlug}
              onChange={e => setForm(f => ({ ...f, propertySlug: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select a property…</option>
              {PROPERTIES.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Your Name *</label>
            <Input
              placeholder="First name or full name"
              value={form.guestName}
              onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
              required
            />
          </div>

          {/* Email (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email <span className="text-muted-foreground font-normal">(optional, not shown publicly)</span></label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={form.guestEmail}
              onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))}
            />
          </div>

          {/* Star rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Overall Rating *</label>
            <StarPicker value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            {form.rating > 0 && (
              <p className="text-sm text-primary font-medium">{RATING_LABELS[form.rating]}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Review Title <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="Summarize your stay in a few words"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={256}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Your Review *</label>
            <Textarea
              placeholder="Tell us about your stay — what did you love? What could be improved?"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={6}
              maxLength={4000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{form.body.length}/4000</p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? "Submitting…" : "Submit Review"}
          </Button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
