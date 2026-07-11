// Rose City Stays — Home Page
// Design: Rose City Luxe — Contemporary Boutique Hotel
// Sections: Hero, Stats, Properties, Why Book Direct, About, Testimonials, Contact, Footer

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wifi,
  Clock,
  Shield,
  Star,
  ChevronDown,
  Percent,
  MessageCircle,
  CalendarCheck,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Users,
  BedDouble,
  Home as HomeIcon,
  PawPrint,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { properties as staticProperties, type Property } from "@/lib/properties";
import { getAllBlogArticles } from "@/lib/blog";
import { Link } from "wouter";

// Generated hero image
const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-01_29d8f2c8.jpg"; // 6127 Photo-3 wide-angle living room
const TYLER_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/tyler-tx-GDKyBfxJZPpPZRX8xgdf9B.webp";
const ABOUT_IMAGE = "https://hostaway-platform.s3.us-west-2.amazonaws.com/listing/127000-329641-ed199p-fMlLVUMe0cGeyajq7Oh7UfA9T0AkrGD49iSY-68c0417870464";

// Intersection observer hook for scroll animations
function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Safety fallback: always show after 2s even if observer doesn't fire
    const fallback = setTimeout(() => setInView(true), 2000);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          clearTimeout(fallback);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, inView };
}

const testimonials = [
  {
    name: "Andy Ehrman",
    date: "December 2025",
    property: "Hollytree Townhouse",
    text: "Everything was perfect. Great communication too. The home was spotless and had everything we needed for our stay.",
    rating: 5,
  },
  {
    name: "Jim Musslewhite",
    date: "October 2025",
    property: "Hollytree Townhouse",
    text: "The property was extremely well done! Beautifully decorated and in a fantastic location. Will definitely be back.",
    rating: 5,
  },
  {
    name: "Sarah M.",
    date: "November 2025",
    property: "The Briar",
    text: "We had the most wonderful stay at The Briar. The space was immaculate, the beds were incredibly comfortable, and the neighborhood was so peaceful.",
    rating: 5,
  },
  {
    name: "David R.",
    date: "September 2025",
    property: "Hospital District Retreat",
    text: "As a traveling nurse, I needed a comfortable, well-connected home base. This property exceeded every expectation. The WiFi was blazing fast and the location was perfect.",
    rating: 5,
  },
];

export default function Home() {
  // Load properties from DB (falls back to static data while loading)
  const { data: dbProperties } = trpc.properties.list.useQuery();

  // Batch-fetch live nightly prices from Hostaway for all properties
  const propertyIds = (dbProperties ?? staticProperties).map((p) => {
    const pAny = p as Record<string, unknown>;
    return ((pAny.slug as string) || (pAny.id as string)) as string;
  });
  const { data: pricesData } = trpc.hostaway.batchPrices.useQuery(
    { propertyIds },
    { enabled: propertyIds.length > 0, staleTime: 5 * 60 * 1000 }
  );
  const prices: Record<string, number | null> = pricesData?.prices ?? {};

  // Filter state
  const [filterGuests, setFilterGuests] = useState("any");
  const [filterBedrooms, setFilterBedrooms] = useState("any");
  const [filterType, setFilterType] = useState("any");
  const [filterPets, setFilterPets] = useState(false);

  // Merge DB data with static data — DB wins for fields it has
  const allProperties: Property[] = (dbProperties ?? staticProperties).map((p) => {
    const pAny = p as Record<string, unknown>;
    // Static properties use `id` as their slug (e.g. "the-briar"), DB uses `slug` field
    const dbSlug = (pAny.slug as string) || (pAny.id as string);
    const staticMatch = staticProperties.find((sp) => sp.id === dbSlug);
    const coverImage = (pAny.image as string) || (pAny.photos as string[])?.[0] || staticMatch?.image || undefined;
    return {
      ...(staticMatch ?? {}),
      ...pAny,
      // Use slug as the id for routing so /property/<slug> works correctly
      id: dbSlug || pAny.id,
      images: ((pAny.photos as string[] | undefined)?.length ? (pAny.photos as string[]) : undefined) ?? (pAny.images as string[] | undefined) ?? staticMatch?.images ?? [],
      image: coverImage,
    } as Property;
  });

  const filteredProperties = allProperties.filter((p: Property) => {
    if (filterGuests !== "any" && p.guests < parseInt(filterGuests)) return false;
    if (filterBedrooms !== "any" && p.bedrooms < parseInt(filterBedrooms)) return false;
    if (filterType !== "any" && p.type !== filterType) return false;
    if (filterPets && (p as any).petsAllowed !== 1) return false;
    return true;
  });

  const propertyTypes = Array.from(new Set(allProperties.map((p: Property) => p.type)));

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    dates: "",
    guests: "",
    property: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const statsSection = useInView();
  const propertiesSection = useInView(0.05);
  const whyDirectSection = useInView();
  const aboutSection = useInView();
  const testimonialsSection = useInView();
  const blogSection = useInView();
  const contactSection = useInView();

  const blogArticles = getAllBlogArticles().slice(0, 3);

  const submitInquiry = trpc.inquiry.submit.useMutation({
    onSuccess: () => {
      toast.success("Message sent! We'll be in touch within 24 hours.", {
        description: "Thank you for your inquiry, " + contactForm.name + ".",
      });
      setContactForm({ name: "", email: "", phone: "", dates: "", guests: "", property: "", message: "" });
      setSubmitting(false);
    },
    onError: () => {
      toast.error("Something went wrong. Please email us directly at gustavo@rosecitystays.com");
      setSubmitting(false);
    },
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    submitInquiry.mutate({
      name: contactForm.name,
      email: contactForm.email,
      phone: contactForm.phone || undefined,
      dates: contactForm.dates || undefined,
      guests: contactForm.guests || undefined,
      property: contactForm.property || undefined,
      message: contactForm.message || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Rose City Stays — Premium rentals in Tyler, TX"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="mb-6 animate-fade-in-up">
            <span
              className="inline-block text-white/80 text-xs tracking-[0.25em] uppercase border border-white/30 rounded-full px-4 py-1.5"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Tyler, Texas · The Rose Capital of America
            </span>
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light text-white mb-6 leading-[1.05] animate-fade-in-up animate-delay-100"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tyler's Premier
            <br />
            <em className="italic">Short-Term Rental Collection</em>
          </h1>

          <p
            className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animate-delay-200"
            style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}
          >
            11 designer properties in Tyler, TX — the Rose Capital of America. Steps from UT Health, Mother Frances Hospital, and downtown dining. 4.9★ rated across 200+ stays.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-300">
            <a href="#properties">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-6 text-base font-medium tracking-wide shadow-lg shadow-primary/30"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Browse Properties
              </Button>
            </a>
            <a href="#contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white bg-white/10 hover:bg-white/20 rounded-full px-8 py-6 text-base font-medium tracking-wide backdrop-blur-sm"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Book Direct & Save
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/50" />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section
        ref={statsSection.ref}
        className="bg-foreground text-background py-10"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "11", label: "Properties" },
              { value: "4.9★", label: "Average Rating" },
              { value: "24/7", label: "Self Check-In" },
              { value: "500+", label: "Mbps WiFi" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`transition-all duration-700 ${statsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="text-3xl lg:text-4xl font-light text-primary mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs tracking-widest uppercase text-background/50"
                  style={{ fontFamily: "var(--font-body)", letterSpacing: "0.15em" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROPERTIES ── */}
      <section id="properties" className="py-24 bg-background">
        <div
          ref={propertiesSection.ref}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Section header */}
          <div className={`mb-14 transition-all duration-700 ${propertiesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span
              className="block text-xs tracking-[0.2em] uppercase text-primary mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Our Collection
            </span>
            <h2
              className="text-4xl lg:text-5xl font-light text-foreground mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              11 Properties. Every Stay
              <br />
              <em className="italic text-muted-foreground">Thoughtfully Designed.</em>
            </h2>
            <div className="w-16 h-px bg-primary mt-6" />
            <p className="text-base text-muted-foreground mt-6 max-w-2xl" style={{ fontFamily: "var(--font-body)" }}>
              From the Hospital District to Hollytree, each Rose City Stays property is fully furnished, professionally managed, and available to book directly — no platform fees, no middleman.
            </p>
          </div>

          {/* Filter Bar */}
          <div className={`mb-10 transition-all duration-700 delay-100 ${propertiesSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Guests filter */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-4 py-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterGuests}
                  onChange={(e) => setFilterGuests(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option value="any">Any guests</option>
                  <option value="2">2+ guests</option>
                  <option value="4">4+ guests</option>
                  <option value="6">6+ guests</option>
                  <option value="8">8+ guests</option>
                </select>
              </div>

              {/* Bedrooms filter */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-4 py-2">
                <BedDouble className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterBedrooms}
                  onChange={(e) => setFilterBedrooms(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option value="any">Any bedrooms</option>
                  <option value="1">1+ bed</option>
                  <option value="2">2+ beds</option>
                  <option value="3">3+ beds</option>
                  <option value="4">4+ beds</option>
                </select>
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-full px-4 py-2">
                <HomeIcon className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option value="any">All types</option>
                  {propertyTypes.map((t: string) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Pets OK filter chip */}
              <button
                onClick={() => setFilterPets(v => !v)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-colors ${
                  filterPets
                    ? "bg-green-100 border-green-400 text-green-700 font-medium"
                    : "bg-muted/60 border-border text-muted-foreground hover:border-green-300"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                <PawPrint className="w-4 h-4" />
                Pets OK
              </button>

              {/* Clear filters */}
              {(filterGuests !== "any" || filterBedrooms !== "any" || filterType !== "any" || filterPets) && (
                <button
                  onClick={() => { setFilterGuests("any"); setFilterBedrooms("any"); setFilterType("any"); setFilterPets(false); }}
                  className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Clear filters
                </button>
              )}

              {/* Result count */}
              <span className="ml-auto text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"}
              </span>
            </div>
          </div>

          {/* Grid */}
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredProperties.map((property: Property, i: number) => (
                <PropertyCard key={property.id} property={property} index={i} nightlyPrice={prices[property.id] ?? null} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-2xl font-light text-muted-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>No properties match your filters</p>
              <button
                onClick={() => { setFilterGuests("any"); setFilterBedrooms("any"); setFilterType("any"); }}
                className="text-primary hover:text-primary/80 underline underline-offset-2 text-sm"
                style={{ fontFamily: "var(--font-body)" }}
              >Clear all filters</button>
            </div>
          )}

          {/* CTA */}
          <div className="text-center mt-14">
            <a href="#contact">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 py-6 text-base font-medium tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Send a Direct Inquiry <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
            <p className="text-sm text-muted-foreground mt-3" style={{ fontFamily: "var(--font-body)" }}>
              No platform fees — book directly with us
            </p>
          </div>
        </div>
      </section>

      {/* ── WHY BOOK DIRECT ── */}
      <section id="why-direct" className="py-24 bg-muted/40">
        <div
          ref={whyDirectSection.ref}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className={`text-center mb-16 transition-all duration-700 ${whyDirectSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span
              className="block text-xs tracking-[0.2em] uppercase text-primary mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              The Direct Advantage
            </span>
            <h2
              className="text-4xl lg:text-5xl font-light text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Skip the Fees. Book Direct.
            </h2>
            <div className="w-16 h-px bg-primary mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Percent className="w-6 h-6" />,
                title: "No Platform Fees",
                description: "Skip the 10–15% service fees charged by Airbnb and VRBO. Book direct and keep more money in your pocket.",
              },
              {
                icon: <MessageCircle className="w-6 h-6" />,
                title: "Direct Communication",
                description: "Talk directly with your host — no middleman, no automated responses. Real answers, fast.",
              },
              {
                icon: <CalendarCheck className="w-6 h-6" />,
                title: "Flexible Arrangements",
                description: "Extended stays, corporate rates, and custom arrangements are all possible when you book direct.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Trusted Host",
                description: "4.9-star rated across all platforms. Your stay is backed by a host who cares about every detail.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`text-center transition-all duration-700 ${whyDirectSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-5 text-primary">
                  {item.icon}
                </div>
                <h3
                  className="text-xl font-medium text-foreground mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 bg-background overflow-hidden">
        <div
          ref={aboutSection.ref}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <div
              className={`relative transition-all duration-700 ${aboutSection.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
            >
              <div className="relative rounded-lg overflow-hidden aspect-[4/5]">
                <img
                  src={ABOUT_IMAGE}
                  alt="Rose City Stays — East Texas Charm"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-lg p-5 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>4.9</div>
                    <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Average Rating</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div
              className={`transition-all duration-700 delay-200 ${aboutSection.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
            >
              <span
                className="block text-xs tracking-[0.2em] uppercase text-primary mb-4"
                style={{ fontFamily: "var(--font-body)" }}
              >
                About Rose City Stays
              </span>
              <h2
                className="text-4xl lg:text-5xl font-light text-foreground mb-6 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Welcome to Your
                <br />
                <em className="italic">Home Away from Home</em>
              </h2>
              <div className="w-12 h-px bg-primary mb-8" />

              <div className="space-y-5 text-base text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                <p>
                  At Rose City Stays, we're more than just a place to stay — we're your gateway to comfort, convenience, and a little slice of East Texas charm. As a dedicated healthcare provider, athlete, and passionate lover of music and food, I understand the importance of creating a space that feels welcoming and rejuvenating.
                </p>
                <p>
                  Our rentals are thoughtfully designed to provide clean, comfortable accommodations that suit every type of traveler. Whether you're visiting Tyler for a weekend getaway, an extended work assignment, or a corporate retreat, we're here to make your stay exceptional.
                </p>
                <p>
                  Explore all that Tyler has to offer — from its vibrant music scene to its mouthwatering food spots — and come back to a space that feels like home.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { icon: <Wifi className="w-4 h-4" />, label: "500+ Mbps WiFi" },
                  { icon: <Clock className="w-4 h-4" />, label: "24-Hour Check-In" },
                  { icon: <MapPin className="w-4 h-4" />, label: "Tyler, TX" },
                  { icon: <CheckCircle2 className="w-4 h-4" />, label: "Professionally Cleaned" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    <span className="text-primary">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TYLER, TX SECTION ── */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={TYLER_IMAGE}
            alt="Tyler, Texas — The Rose Capital of America"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="block text-xs tracking-[0.2em] uppercase text-white/60 mb-4"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Discover Tyler
          </span>
          <h2
            className="text-4xl lg:text-6xl font-light text-white mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The Rose Capital
            <br />
            <em className="italic">of America</em>
          </h2>
          <p className="text-lg text-white/70 leading-relaxed" style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}>
            Tyler, Texas is home to the world's largest rose garden, a vibrant arts and music scene, outstanding dining, and warm Southern hospitality. Let Rose City Stays be your base to explore it all.
          </p>
        </div>
      </section>

      {/* ── BLOG PREVIEW ── */}
      <section className="py-24 bg-background">
        <div
          ref={blogSection.ref}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className={`mb-14 transition-all duration-700 ${blogSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span
              className="block text-xs tracking-[0.2em] uppercase text-primary mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Rose City Insights
            </span>
            <h2
              className="text-4xl lg:text-5xl font-light text-foreground mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Discover Tyler
              <br />
              <em className="italic text-muted-foreground">Through Our Blog</em>
            </h2>
            <div className="w-16 h-px bg-primary mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {blogArticles.map((article, i) => (
              <Link key={article.id} href={`/blog/${article.slug}`}>
                <div
                  className={`group cursor-pointer transition-all duration-700 ${blogSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="relative rounded-lg overflow-hidden aspect-video mb-5 bg-muted">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="text-xs tracking-[0.1em] uppercase text-primary mb-2" style={{ fontFamily: "var(--font-body)" }}>
                    {article.category}
                  </div>
                  <h3
                    className="text-lg font-medium text-foreground mb-2 group-hover:text-primary transition-colors"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: "var(--font-body)" }}>
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    <span>{article.readTime} min read</span>
                    <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <a href="/blog">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 py-6 text-base font-medium tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Read All Articles <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-muted/30">
        <div
          ref={testimonialsSection.ref}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className={`text-center mb-16 transition-all duration-700 ${testimonialsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span
              className="block text-xs tracking-[0.2em] uppercase text-primary mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Guest Reviews
            </span>
            <h2
              className="text-4xl lg:text-5xl font-light text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What Our Guests Say
            </h2>
            <div className="w-16 h-px bg-primary mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`bg-card border border-border rounded-lg p-8 transition-all duration-700 ${testimonialsSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote
                  className="text-base text-foreground/80 leading-relaxed mb-6 italic"
                  style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}
                >
                  "{t.text}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>{t.name}</div>
                    <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{t.date} · {t.property}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-primary text-xs font-medium" style={{ fontFamily: "var(--font-display)" }}>
                      {t.name.charAt(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / INQUIRY ── */}
      <section id="contact" className="py-24 bg-background">
        <div
          ref={contactSection.ref}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className={`text-center mb-12 transition-all duration-700 ${contactSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span
              className="block text-xs tracking-[0.2em] uppercase text-primary mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Book Direct
            </span>
            <h2
              className="text-4xl lg:text-5xl font-light text-foreground mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Send an Inquiry
            </h2>
            <p className="text-base text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Skip the platform fees. Reach out directly and we'll get back to you within 24 hours.
            </p>
            <div className="w-16 h-px bg-primary mx-auto mt-6" />
          </div>

          <div className={`bg-card border border-border rounded-xl p-8 lg:p-10 shadow-sm transition-all duration-700 delay-200 ${contactSection.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Full Name *
                  </label>
                  <Input
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Jane Smith"
                    className="bg-background border-border focus:border-primary rounded-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Email *
                  </label>
                  <Input
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="bg-background border-border focus:border-primary rounded-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                    className="bg-background border-border focus:border-primary rounded-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                    Number of Guests
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={contactForm.guests}
                    onChange={(e) => setContactForm({ ...contactForm, guests: e.target.value })}
                    placeholder="2"
                    className="bg-background border-border focus:border-primary rounded-md"
                    style={{ fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                  Preferred Dates
                </label>
                <Input
                  value={contactForm.dates}
                  onChange={(e) => setContactForm({ ...contactForm, dates: e.target.value })}
                  placeholder="e.g. April 15 – April 20, 2026"
                  className="bg-background border-border focus:border-primary rounded-md"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                  Property of Interest
                </label>
                <select
                  value={contactForm.property}
                  onChange={(e) => setContactForm({ ...contactForm, property: e.target.value })}
                  className="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option value="">Any / Not sure yet</option>
                  {allProperties.map((p) => (
                    <option key={p.id} value={p.shortName}>{p.shortName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "var(--font-body)" }}>
                  Message
                </label>
                <Textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Tell us about your stay — purpose of visit, any special requirements..."
                  rows={4}
                  className="bg-background border-border focus:border-primary rounded-md resize-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-base font-medium tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {submitting ? "Sending..." : "Send Inquiry"}
              </Button>

              <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                Or email us directly at{" "}
                <a href="mailto:gustavo@rosecitystays.com" className="text-primary hover:underline">
                  gustavo@rosecitystays.com
                </a>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-24 bg-foreground text-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="block text-xs tracking-[0.2em] uppercase text-primary mb-4"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Book Direct
          </span>
          <h2
            className="text-4xl lg:text-5xl font-light text-background mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Book Direct. Save More.
            <br />
            <em className="italic">Stay Better.</em>
          </h2>
          <p className="text-base text-background/60 mb-10 leading-relaxed" style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}>
            Skip Airbnb and VRBO fees — guests who book directly with Rose City Stays save 10–15% and get direct access to our team before, during, and after their stay.
          </p>
          <a href="#properties">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 py-6 text-base font-medium tracking-wide shadow-lg shadow-primary/30"
              style={{ fontFamily: "var(--font-body)" }}
            >
              See All Properties <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
