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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPropertyById, properties as staticProperties, type Property } from "@/lib/properties";
import PropertyCard from "@/components/PropertyCard";
import PhotoLightbox from "@/components/PhotoLightbox";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import ReviewsSection from "@/components/ReviewsSection";
import { propertyReviews } from "@/lib/reviews";
import { trpc } from "@/lib/trpc";
import BookingPanel, { type BookingSelection } from "@/components/BookingPanel";
import CheckoutModal from "@/components/CheckoutModal";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();

  // Load property from DB (falls back to static data while loading)
  const { data: dbProperty, isLoading: dbLoading } = trpc.properties.bySlug.useQuery(
    { slug: id || "" },
    { enabled: !!id, staleTime: 5 * 60 * 1000, retry: false }
  );

  const staticProperty = getPropertyById(id || "");
  const property: Property | null = dbProperty
    ? ({
        ...(staticProperty ?? {}),
        ...dbProperty,
        guests: Number(dbProperty.guests) || staticProperty?.guests || 1,
        bedrooms: Number(dbProperty.bedrooms) || staticProperty?.bedrooms || 1,
        bathrooms: Number(dbProperty.bathrooms) || staticProperty?.bathrooms || 1,
        images: dbProperty.photos?.length ? dbProperty.photos : (staticProperty?.images ?? []),
        image: dbProperty.image || staticProperty?.image || "",
        rating: staticProperty?.rating ?? 5.0,
        reviewCount: staticProperty?.reviewCount ?? 0,
        highlights: staticProperty?.highlights ?? [],
        priceNote: staticProperty?.priceNote ?? "",
        hostaway_url: dbProperty.hostaway_url || staticProperty?.hostaway_url || "",
      } as unknown as Property)
    : (staticProperty ?? null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [checkoutBooking, setCheckoutBooking] = useState<BookingSelection | null>(null);
  const [showInquiry, setShowInquiry] = useState(false);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    dates: "",
    guests: "2",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (dbLoading && !staticProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  const submitInquiry = trpc.inquiry.submit.useMutation({
    onSuccess: () => {
      toast.success("Inquiry sent for " + property!.shortName + "!", {
        description: "We'll confirm availability and get back to you within 24 hours.",
      });
      setInquiryForm({ name: "", email: "", dates: "", guests: "2", message: "" });
      setSubmitting(false);
    },
    onError: () => {
      toast.error("Failed to send inquiry. Please email us directly.");
      setSubmitting(false);
    },
  });

  // Use slug (from URL param `id`) for all Hostaway lookups — the map keys are slugs, not numeric IDs
  const propertySlug = property?.slug || id || "";

  const { data: priceData } = trpc.hostaway.basePrice.useQuery(
    { propertyId: propertySlug },
    { enabled: !!propertySlug, staleTime: 10 * 60 * 1000 }
  );

  const { data: calendarData } = trpc.hostaway.calendar.useQuery(
    {
      propertyId: propertySlug,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
            { enabled: !!propertySlug, staleTime: 5 * 60 * 1000 }
  );

  const { data: taxRateData } = trpc.settings.getTaxRate.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const liveTaxRate = taxRateData?.taxRate ?? 0.09;

  const { data: activeFeesData } = trpc.settings.getActiveFees.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const activeFees = activeFeesData ?? [];

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    submitInquiry.mutate({
      name: inquiryForm.name,
      email: inquiryForm.email,
      dates: inquiryForm.dates,
      guests: inquiryForm.guests,
      property: property!.shortName,
      message: inquiryForm.message,
    });
  };

  const relatedProperties = staticProperties
    .filter((p: Property) => p.id !== property.id)
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
        <div className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl overflow-hidden">
            <div
              className="col-span-2 row-span-2 relative cursor-pointer group"
              onClick={() => openLightbox(0)}
            >
              {property.images[0] ? (
                <img
                  src={property.images[0]}
                  alt={property.shortName}
                  className="w-full h-72 lg:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-72 lg:h-96 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No photo available</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            {property.images.slice(1, 3).map((img, i) => (
              <div
                key={i}
                className="relative cursor-pointer group overflow-hidden"
                onClick={() => openLightbox(i + 1)}
              >
                {img ? (
                  <img
                    src={img}
                    alt={`${property.shortName} ${i + 2}`}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ height: "calc(50% - 6px)", minHeight: "144px" }}
                  />
                ) : (
                  <div className="w-full bg-muted" style={{ height: "calc(50% - 6px)", minHeight: "144px" }} />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
          {/* View all photos button */}
          {property.images.length > 3 && (
            <button
              onClick={() => openLightbox(0)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-foreground text-sm font-medium px-4 py-2 rounded-full shadow-md hover:bg-white transition-colors flex items-center gap-2"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
                {[0,1,2,3].map(n => <span key={n} className="bg-foreground/70 rounded-sm" />)}
              </span>
              View all {property.images.length} photos
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <PhotoLightbox
          images={property.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
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

            {/* Availability Calendar */}
            <div className="mb-10">
              <AvailabilityCalendar propertyId={propertySlug} />
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
            <div className="sticky top-24 space-y-6">
              <BookingPanel
                propertyId={propertySlug}
                propertyName={property.name}
                basePrice={priceData?.price || null}
                rating={property.rating}
                reviewCount={property.reviewCount}
                calendarDays={calendarData?.days || []}
                onBookNow={(booking) => setCheckoutBooking(booking)}
                onInquiry={() => setShowInquiry(true)}
              />

              {/* Direct Inquiry Form (collapsible) */}
              {showInquiry && (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutBooking && property && (() => {
        const CLEANING: Record<string, number> = { "the-briar": 150, "hospital-district": 125, "hollytree-golf-dining": 150, "alamo-house": 175, "green-acres": 150, "legacy-house": 150, "azalea-spring-cottage": 125, "noir-hollytree": 125, "hollytree-king-bed": 125, "hollytree-townhouse": 125 };
        const cleaningFee = (CLEANING[propertySlug] ?? 125);
        const subtotal = Math.round(checkoutBooking.avgNightlyRate * checkoutBooking.nights * 100) / 100;
        const taxAmount = Math.round(subtotal * liveTaxRate * 100) / 100;
        const totalAmount = Math.round((subtotal + cleaningFee + taxAmount) * 100) / 100;
        return (
          <CheckoutModal
            propertyId={propertySlug}
            propertyName={property.name}
            checkIn={checkoutBooking.checkIn}
            checkOut={checkoutBooking.checkOut}
            nights={checkoutBooking.nights}
            avgNightlyRate={checkoutBooking.avgNightlyRate}
            guestCount={checkoutBooking.guestCount}
            cleaningFee={cleaningFee}
            subtotal={subtotal}
            taxAmount={taxAmount}
            taxRate={liveTaxRate}
            totalAmount={totalAmount}
            customFees={activeFees}
            onClose={() => setCheckoutBooking(null)}
          />
        );
      })()}

      {/* Guest Reviews */}
      <div className="bg-background py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Guest Reviews
          </h2>
          <ReviewsSection
            reviews={propertyReviews[String(property.id)] || []}
            propertyName={property.name}
          />
        </div>
      </div>

      {/* Related Properties */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-light text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
            More Properties You May Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProperties.map((p: Property, i: number) => (
              <PropertyCard key={p.id} property={p} index={i} />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
