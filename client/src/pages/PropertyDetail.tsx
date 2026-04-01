// Rose City Stays — Property Detail Page
// Design: Rose City Luxe — full-width image gallery, booking sidebar

import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Star,
  Users,
  BedDouble,
  Bath,
  Wifi,
  Clock,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPropertyById, properties } from "@/lib/properties";
import PropertyCard from "@/components/PropertyCard";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const property = getPropertyById(id || "");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    dates: "",
    guests: "2",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Navbar />
        <div className="text-center px-4 mt-20">
          <h1 className="text-4xl font-light text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Property Not Found
          </h1>
          <p className="text-muted-foreground mb-8" style={{ fontFamily: "var(--font-body)" }}>
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/#properties">
            <Button className="bg-primary text-primary-foreground rounded-full px-8" style={{ fontFamily: "var(--font-body)" }}>
              Browse All Properties
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    toast.success("Inquiry sent for " + property.shortName + "!", {
      description: "We'll confirm availability and get back to you within 24 hours.",
    });
    setInquiryForm({ name: "", email: "", dates: "", guests: "2", message: "" });
  };

  const relatedProperties = properties
    .filter((p) => p.id !== property.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Back nav */}
      <div className="pt-20 lg:pt-24 pb-4 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/#properties">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2" style={{ fontFamily: "var(--font-body)" }}>
              <ChevronLeft className="w-4 h-4" />
              Back to all properties
            </button>
          </Link>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl overflow-hidden">
          <div
            className="col-span-2 row-span-2 relative cursor-pointer group"
            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
          >
            <img
              src={property.images[0]}
              alt={property.shortName}
              className="w-full h-72 lg:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
          {property.images.slice(1, 3).map((img, i) => (
            <div
              key={i}
              className="relative cursor-pointer group overflow-hidden"
              onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}
            >
              <img
                src={img}
                alt={`${property.shortName} ${i + 2}`}
                className="w-full h-[calc(50%-6px)] lg:h-[calc(192px-6px)] object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ height: "calc(50% - 6px)" }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={property.images[lightboxIndex]}
            alt={property.shortName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: Details */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-mauve">{property.type}</span>
                <span className="badge-mauve">{property.neighborhood}</span>
              </div>
              <h1
                className="text-3xl lg:text-4xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {property.name}
              </h1>
              <div className="flex items-center gap-6 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <strong className="text-foreground">{property.rating.toFixed(2)}</strong>
                  <span>({property.reviewCount} reviews)</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Tyler, TX
                </span>
              </div>
            </div>

            <div className="rule-thin mb-8" />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[
                { icon: <Users className="w-5 h-5" />, value: `${property.guests} guests`, label: "Max Capacity" },
                { icon: <BedDouble className="w-5 h-5" />, value: `${property.bedrooms} bedrooms`, label: "Bedrooms" },
                { icon: <Bath className="w-5 h-5" />, value: `${property.bathrooms} bathrooms`, label: "Bathrooms" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex justify-center text-primary mb-2">{stat.icon}</div>
                  <div className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="rule-thin mb-8" />

            {/* Description */}
            <div className="mb-10">
              <h2 className="text-2xl font-light text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
                About This Property
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {property.description}
              </p>
            </div>

            {/* Highlights */}
            <div className="mb-10">
              <h2 className="text-2xl font-light text-foreground mb-5" style={{ fontFamily: "var(--font-display)" }}>
                Property Highlights
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {property.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2 text-sm text-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </div>

            <div className="rule-thin mb-8" />

            {/* Amenities */}
            <div className="mb-10">
              <h2 className="text-2xl font-light text-foreground mb-5" style={{ fontFamily: "var(--font-display)" }}>
                Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>

            <div className="rule-thin mb-8" />

            {/* House Rules */}
            <div className="mb-10">
              <h2 className="text-2xl font-light text-foreground mb-5" style={{ fontFamily: "var(--font-display)" }}>
                House Rules & Policies
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <Clock className="w-4 h-4" />, label: "Check-in", value: property.checkIn },
                  { icon: <Clock className="w-4 h-4" />, label: "Check-out", value: property.checkOut },
                  { icon: <Wifi className="w-4 h-4" />, label: "WiFi", value: "500+ Mbps included" },
                  { icon: <Calendar className="w-4 h-4" />, label: "Self Check-In", value: "24-hour access" },
                ].map((rule) => (
                  <div key={rule.label} className="flex items-start gap-3 p-4 bg-muted/40 rounded-lg">
                    <span className="text-primary mt-0.5">{rule.icon}</span>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>{rule.label}</div>
                      <div className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>{rule.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-accent/30 rounded-lg">
                <p className="text-sm text-foreground/70" style={{ fontFamily: "var(--font-body)" }}>
                  <strong className="text-foreground">Cancellation Policy:</strong> {property.cancellationPolicy}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Book on Hostaway CTA */}
              <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
                <div className="text-center mb-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-body)" }}>
                    Book This Property
                  </p>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-medium text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                      {property.rating.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                      ({property.reviewCount} reviews)
                    </span>
                  </div>
                </div>

                <a
                  href={property.hostaway_url || "https://www.rosecitystays.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-base font-medium"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Book on Hostaway <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>

                <div className="mt-4 flex items-center gap-2 justify-center">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <p className="text-center text-xs text-muted-foreground mt-3" style={{ fontFamily: "var(--font-body)" }}>
                  Send a direct inquiry below — no platform fees
                </p>
              </div>

              {/* Direct Inquiry Form */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-light text-foreground mb-5" style={{ fontFamily: "var(--font-display)" }}>
                  Send Direct Inquiry
                </h3>
                <form onSubmit={handleInquiry} className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>Name *</label>
                    <Input
                      required
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      placeholder="Your name"
                      className="bg-background text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>Email *</label>
                    <Input
                      required
                      type="email"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      placeholder="your@email.com"
                      className="bg-background text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>Dates</label>
                    <Input
                      value={inquiryForm.dates}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, dates: e.target.value })}
                      placeholder="Apr 15 – Apr 20"
                      className="bg-background text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>Guests</label>
                    <Input
                      type="number"
                      min="1"
                      max={property.guests}
                      value={inquiryForm.guests}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, guests: e.target.value })}
                      className="bg-background text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>Message</label>
                    <Textarea
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      placeholder="Any questions or special requests?"
                      rows={3}
                      className="bg-background text-sm resize-none"
                      style={{ fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {submitting ? "Sending..." : "Send Inquiry"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Properties */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-light text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
            More Properties You May Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProperties.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
