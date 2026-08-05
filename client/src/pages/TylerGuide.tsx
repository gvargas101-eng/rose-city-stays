/**
 * TylerGuide — SEO-optimized local area guide for Tyler, TX
 * Covers: attractions, dining, neighborhoods, events, medical district, UT Tyler
 * Designed to rank for "things to do in Tyler TX", "Tyler TX visitor guide", etc.
 */

import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { generateBreadcrumbSchema } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Flower2,
  TreePine,
  Utensils,
  GraduationCap,
  Heart,
  Star,
  Calendar,
  ArrowRight,
  Home,
} from "lucide-react";
// ---- Data ----
const attractions = [
  {
    name: "Tyler Municipal Rose Garden",
    category: "Parks & Gardens",
    description:
      "The largest municipal rose garden in the United States, spanning 14 acres with more than 32,000 rose bushes and over 500 varieties. Free admission year-round. Peak bloom is typically mid-April through May and again in October.",
    address: "420 Rose Park Dr, Tyler, TX 75702",
    tip: "Visit during the Texas Rose Festival in October for the full Rose City experience.",
    icon: Flower2,
  },
  {
    name: "Caldwell Zoo",
    category: "Family",
    description:
      "A beloved 85-acre zoo home to more than 3,000 animals from North and South America, Africa, and East Texas. One of the top-rated zoos in Texas, with a strong conservation mission and free admission.",
    address: "2203 Martin Luther King Blvd, Tyler, TX 75702",
    tip: "Arrive early on weekends — the zoo gets busy by mid-morning. Parking is free.",
    icon: TreePine,
  },
  {
    name: "Azalea & Spring Flower Trail",
    category: "Scenic",
    description:
      "Every spring, the historic Azalea District transforms into a riot of color as thousands of azaleas bloom along winding residential streets. The self-guided trail runs through some of Tyler's most beautiful old neighborhoods.",
    address: "Azalea District, Tyler, TX 75701",
    tip: "Peak bloom is typically late March. The annual Azalea & Spring Flower Trail event draws visitors from across Texas.",
    icon: Flower2,
  },
  {
    name: "Downtown Tyler",
    category: "Shopping & Dining",
    description:
      "The revitalized downtown square features locally owned boutiques, art galleries, craft breweries, wine bars, and acclaimed restaurants. The Tyler Museum of Art and the Liberty Hall performing arts venue anchor the cultural scene.",
    address: "Downtown Square, Tyler, TX 75701",
    tip: "First Friday Art Walk happens the first Friday of each month — galleries stay open late and the streets come alive.",
    icon: MapPin,
  },
  {
    name: "UT Tyler (University of Texas at Tyler)",
    category: "Education",
    description:
      "A growing research university with over 10,000 students, UT Tyler hosts public lectures, performing arts events, and sporting events throughout the year. The campus is open to visitors and features walking trails.",
    address: "3900 University Blvd, Tyler, TX 75799",
    tip: "Check the UT Tyler events calendar for free public concerts and lectures.",
    icon: GraduationCap,
  },
  {
    name: "Tyler State Park",
    category: "Outdoor",
    description:
      "A 985-acre park centered on a beautiful 64-acre spring-fed lake. Offers swimming, fishing, paddling, hiking, mountain biking, and camping just minutes from the city. One of the most popular state parks in East Texas.",
    address: "789 Park Rd 16, Tyler, TX 75706",
    tip: "Reserve a campsite or day-use area online in advance, especially for spring and fall weekends.",
    icon: TreePine,
  },
];

const restaurants = [
  {
    name: "Stanley's Famous Pit Bar-B-Q",
    type: "BBQ",
    description: "An East Texas institution since 1958. Slow-smoked brisket, ribs, and links with a loyal following. A must-visit for any first-time Tyler visitor.",
    neighborhood: "Near Hospital District",
  },
  {
    name: "Kiepersol Winery & Restaurant",
    type: "Fine Dining / Winery",
    description: "Award-winning East Texas winery with an on-site restaurant serving farm-to-table cuisine. The estate is a stunning setting for a special dinner.",
    neighborhood: "Tyler outskirts",
  },
  {
    name: "Villaggio Del Vino",
    type: "Italian / Wine Bar",
    description: "Tyler's top-rated Italian restaurant and wine bar, serving handcrafted pizzas, pastas, and small plates in a modern space with a patio. Consistently ranked #1 for Italian in Tyler.",
    neighborhood: "South Tyler (Old Bullard Rd)",
  },
  {
    name: "Posados Café",
    type: "Tex-Mex",
    description: "A Tyler original serving generous portions of Tex-Mex classics in a festive atmosphere. The frozen margaritas and queso are local favorites.",
    neighborhood: "Multiple locations",
  },
  {
    name: "Rick's on the Square",
    type: "Southern / Live Music",
    description: "A downtown institution for 30+ years. Scratch-made Southern food, fresh seafood, and steaks — plus one of Tyler's premier live music stages. Free two-step lessons every Tuesday night.",
    neighborhood: "Downtown Tyler",
  },
  {
    name: "True Vine Brewing Company",
    type: "Craft Brewery",
    description: "Tyler's original craft brewery, offering rotating taps of locally brewed ales and lagers in a relaxed, dog-friendly taproom. Live music and food trucks rotate on weekends.",
    neighborhood: "Downtown Tyler",
  },
  {
    name: "Prime 102",
    type: "Steakhouse / Seafood",
    description: "Downtown Tyler's premier steakhouse, housed in the historic People's Petroleum Building. First-rate cuts, fresh seafood, and handcrafted cocktails in an elegant setting. Reservations recommended.",
    neighborhood: "Downtown Tyler (102 N College Ave)",
  },
  {
    name: "Don Juan's on the Square",
    type: "Tex-Mex",
    description: "A beloved downtown Tyler institution serving authentic Mexican food with a loyal local following. Known for the best margaritas on the square, generous portions, and a festive patio atmosphere.",
    neighborhood: "Downtown Tyler (113 E Erwin St)",
  },
];

const neighborhoods = [
  {
    name: "Hollytree",
    description:
      "Tyler's premier master-planned community, home to the Hollytree Country Club and golf course. Tree-lined streets, upscale homes, and a quiet, suburban feel. Several Rose City Stays properties are located here.",
    vibe: "Upscale & Residential",
  },
  {
    name: "Azalea Historic District",
    description:
      "One of Tyler's most photographed neighborhoods, famous for its canopy of azaleas in spring. Beautiful historic homes, walkable streets, and close proximity to downtown.",
    vibe: "Historic & Scenic",
  },
  {
    name: "Hospital District",
    description:
      "Central Tyler's medical hub, home to UT Health East Texas and Christus Trinity Mother Frances. Convenient for traveling medical professionals and families visiting patients. Close to Stanley's BBQ and downtown.",
    vibe: "Central & Convenient",
  },
  {
    name: "Downtown Tyler",
    description:
      "The city's cultural and entertainment core. Walkable, with restaurants, bars, boutiques, galleries, and the Tyler Rose Museum all within a few blocks.",
    vibe: "Walkable & Vibrant",
  },
];

const events = [
  { name: "Texas Rose Festival", month: "October", description: "Tyler's signature annual event celebrating the rose industry with a parade, coronation, and garden tours. One of Texas's oldest and most beloved festivals." },
  { name: "Azalea & Spring Flower Trail", month: "March–April", description: "A self-guided driving and walking tour through neighborhoods ablaze with azaleas, dogwoods, and wisteria." },
  { name: "Downtown Tyler Music Festival", month: "September", description: "A free outdoor music festival on the downtown square featuring local and regional artists across multiple stages." },
  { name: "CityFest", month: "June", description: "A family-friendly summer festival with live music, food vendors, and activities in downtown Tyler." },
  { name: "First Friday Art Walk", month: "Monthly", description: "Downtown galleries stay open late on the first Friday of each month, with live music and street vendors creating a festive atmosphere." },
];

// ---- Component ----

export default function TylerGuide() {
  useSEO(
    {
      title: "Tyler, Texas Visitor Guide — Things to Do, Dining & Neighborhoods | Rose City Stays",
      description:
        "Explore Tyler, TX: best attractions, restaurants, neighborhoods & events in the Rose Capital of America. Short-term rentals near it all.",
      ogType: "article",
      path: "/tyler-guide",
      keywords: [
        "things to do Tyler TX",
        "Tyler Texas visitor guide",
        "Tyler TX restaurants",
        "Tyler TX neighborhoods",
        "East Texas travel guide",
        "Rose Capital of America",
      ],
    },
    generateBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Tyler, TX Guide", path: "/tyler-guide" },
    ])
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative bg-foreground text-background py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, var(--primary) 0%, transparent 60%)" }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-2 text-background/60 text-xs tracking-widest uppercase mb-4" style={{ fontFamily: "var(--font-body)" }}>
            <MapPin className="w-3.5 h-3.5" />
            <span>Tyler, Texas · East Texas</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-background mb-5 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Your Guide to the<br />
            <em className="italic text-primary">Rose Capital of America</em>
          </h1>
          <p className="text-lg text-background/75 max-w-2xl leading-relaxed mb-8" style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}>
            Tyler, Texas is a city of surprising depth — world-class rose gardens, a beloved zoo, a thriving food scene, and warm East Texas hospitality. Whether you are visiting for business, a medical stay, or a weekend getaway, this guide covers everything worth knowing.
          </p>
          <Link href="/#properties">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 py-5 text-sm font-medium" style={{ fontFamily: "var(--font-body)" }}>
              Browse Rentals Near These Attractions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── QUICK FACTS ── */}
      <section className="border-b border-border bg-muted/30 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "~115K", label: "Population" },
              { value: "14 acres", label: "Rose Garden" },
              { value: "3,000+", label: "Zoo Animals" },
              { value: "985 acres", label: "State Park" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-light text-primary mb-0.5" style={{ fontFamily: "var(--font-display)" }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide" style={{ fontFamily: "var(--font-body)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP ATTRACTIONS ── */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>Explore</span>
            <h2 className="text-3xl lg:text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Top Attractions in Tyler, TX
            </h2>
            <div className="w-12 h-px bg-primary mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {attractions.map(attr => (
              <div key={attr.name} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <attr.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm leading-snug" style={{ fontFamily: "var(--font-display)" }}>{attr.name}</h3>
                      <span className="text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0">{attr.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3" style={{ fontFamily: "var(--font-body)" }}>{attr.description}</p>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary/60" />
                      <span>{attr.address}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                      <Star className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                      <span style={{ fontFamily: "var(--font-body)" }}><strong>Local tip:</strong> {attr.tip}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DINING ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>Where to Eat</span>
            <h2 className="text-3xl lg:text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Tyler's Best Restaurants
            </h2>
            <div className="w-12 h-px bg-primary mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map(r => (
              <div key={r.name} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs text-primary font-medium">{r.type}</span>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2" style={{ fontFamily: "var(--font-display)" }}>{r.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3" style={{ fontFamily: "var(--font-body)" }}>{r.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 text-primary/60" />
                  <span>{r.neighborhood}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEIGHBORHOODS ── */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>Where to Stay</span>
            <h2 className="text-3xl lg:text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Tyler's Best Neighborhoods
            </h2>
            <div className="w-12 h-px bg-primary mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {neighborhoods.map(n => (
              <div key={n.name} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{n.name}</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1 flex-shrink-0">{n.vibe}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{n.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
            <Home className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Stay in the Heart of Tyler
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto" style={{ fontFamily: "var(--font-body)" }}>
              Rose City Stays has properties in Hollytree, the Hospital District, and other prime Tyler neighborhoods — all available to book directly with no platform fees.
            </p>
            <Link href="/#properties">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 py-5 text-sm font-medium" style={{ fontFamily: "var(--font-body)" }}>
                Browse All Properties
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── EVENTS ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>Annual Events</span>
            <h2 className="text-3xl lg:text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Tyler Events & Festivals
            </h2>
            <div className="w-12 h-px bg-primary mt-4" />
          </div>

          <div className="space-y-4">
            {events.map(ev => (
              <div key={ev.name} className="bg-card border border-border rounded-xl p-5 flex items-start gap-5">
                <div className="w-16 text-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                  <span className="text-xs font-medium text-primary leading-tight block" style={{ fontFamily: "var(--font-body)" }}>{ev.month}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>{ev.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEDICAL / CORPORATE ── */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="block text-xs tracking-[0.2em] uppercase text-primary mb-3" style={{ fontFamily: "var(--font-body)" }}>Medical & Corporate</span>
              <h2 className="text-3xl font-light text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Visiting Tyler for Work or Medical Care?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: "var(--font-body)" }}>
                Tyler is the medical hub of East Texas, home to <strong className="text-foreground">UT Health East Texas</strong> and <strong className="text-foreground">Christus Trinity Mother Frances</strong> — two major regional hospital systems. Traveling nurses, patients, and families visiting for extended medical stays make up a significant portion of our guests.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
                Our properties near the Hospital District offer high-speed WiFi (500+ Mbps), full kitchens, washer/dryer, and flexible stays — everything you need for a comfortable extended stay without the cost of a hotel.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/corporate-stays">
                  <Button variant="outline" className="rounded-full px-6 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                    Corporate & Extended Stays
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/#properties">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                    Browse Properties
                  </Button>
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { icon: Heart, title: "UT Health East Texas", desc: "Major regional health system with multiple campuses across Tyler and East Texas." },
                { icon: Heart, title: "Christus Trinity Mother Frances", desc: "Comprehensive medical center serving East Texas with specialty and emergency care." },
                { icon: GraduationCap, title: "UT Tyler", desc: "Growing research university with medical, nursing, and health science programs." },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4 bg-muted/40 rounded-xl p-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm mb-0.5" style={{ fontFamily: "var(--font-display)" }}>{item.title}</div>
                    <div className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 bg-foreground text-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-light text-background mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Ready to Experience Tyler?
          </h2>
          <p className="text-background/70 mb-8 text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            Book one of our 10 handpicked properties and stay like a local — no platform fees, direct communication with your host, and everything you need for a perfect East Texas stay.
          </p>
          <Link href="/#properties">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-5 text-base font-medium" style={{ fontFamily: "var(--font-body)" }}>
              Browse All Properties
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
