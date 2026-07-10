// Rose City Stays — House Rules Page
// Standalone page displaying consolidated house rules for all properties

import { useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  CigaretteOff,
  PawPrint,
  PartyPopper,
  Moon,
  Users,
  Trash2,
  Wifi,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Volume2,
  ShieldCheck,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const RULE_CATEGORIES = [
  {
    icon: CigaretteOff,
    title: "No Smoking",
    color: "text-red-500",
    bg: "bg-red-50 border-red-100",
    rules: [
      "Smoking of any substance is strictly prohibited inside the property.",
      "This includes tobacco, marijuana, vaping, e-cigarettes, and any other substance.",
      "Smoking is also prohibited within 25 feet of any entrance or window.",
      "A minimum cleaning fee of $250 will be charged for any evidence of smoking indoors.",
    ],
  },
  {
    icon: PawPrint,
    title: "No Pets",
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-100",
    rules: [
      "Pets are not permitted unless the listing explicitly states 'pets allowed.'",
      "Prior written approval from the Host is required for any pet.",
      "Unauthorized pets will result in a minimum fee of $150 per pet per night.",
      "Approved pets must not be left unattended in the property.",
    ],
  },
  {
    icon: PartyPopper,
    title: "No Parties or Events",
    color: "text-purple-500",
    bg: "bg-purple-50 border-purple-100",
    rules: [
      "The property may not be used for parties, events, or gatherings.",
      "Only registered guests are permitted to stay overnight.",
      "Day visitors are limited to a reasonable number and must not exceed total occupancy.",
      "Any unauthorized gathering is grounds for immediate termination of the booking without refund.",
    ],
  },
  {
    icon: Volume2,
    title: "Quiet Hours",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
    rules: [
      "Quiet hours are in effect from 10:00 PM to 8:00 AM daily.",
      "Please be respectful of neighbors at all times, including during daytime hours.",
      "Music, TV, and other audio should be kept at a reasonable volume.",
      "Outdoor noise (including on patios and balconies) must comply with quiet hours.",
    ],
  },
  {
    icon: Users,
    title: "Guest Registration",
    color: "text-teal-500",
    bg: "bg-teal-50 border-teal-100",
    rules: [
      "All adult occupants (18+) must be registered with the Host prior to or upon check-in.",
      "The number of guests may not exceed the maximum occupancy listed for the property.",
      "The primary Guest (the person who made the booking) is responsible for all registered guests.",
      "Unregistered overnight guests are strictly prohibited.",
    ],
  },
  {
    icon: Clock,
    title: "Check-In & Check-Out",
    color: "text-indigo-500",
    bg: "bg-indigo-50 border-indigo-100",
    rules: [
      "Check-in time is 3:00 PM (Central Time). Early check-in is not guaranteed.",
      "Check-out time is 11:00 AM (Central Time). Late check-out may incur additional fees.",
      "Self check-in instructions will be provided via the booking confirmation.",
      "Please report any pre-existing damage within 2 hours of check-in.",
    ],
  },
  {
    icon: Trash2,
    title: "Property Care & Cleanliness",
    color: "text-green-600",
    bg: "bg-green-50 border-green-100",
    rules: [
      "Please treat the property with respect and leave it in a reasonably clean condition.",
      "Dispose of all trash in the designated receptacles before check-out.",
      "Wash dishes or place them in the dishwasher before departure.",
      "Do not rearrange furniture or remove items from the property.",
      "Report any damage or maintenance issues to the Host promptly.",
    ],
  },
  {
    icon: Wifi,
    title: "Technology & Utilities",
    color: "text-sky-500",
    bg: "bg-sky-50 border-sky-100",
    rules: [
      "Wi-Fi is provided for personal use only. Do not use for illegal downloads or activities.",
      "Please turn off lights, fans, and HVAC when leaving the property for extended periods.",
      "Do not tamper with smart home devices, security cameras (exterior only), or thermostats.",
      "Report any technology issues to the Host as soon as possible.",
    ],
  },
  {
    icon: Key,
    title: "Access & Security",
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-100",
    rules: [
      "Do not share access codes or keys with unauthorized persons.",
      "Ensure all doors and windows are locked when leaving the property.",
      "Exterior security cameras may be present for property security purposes.",
      "Do not attempt to access any locked rooms, storage areas, or equipment.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Safety & Emergencies",
    color: "text-red-600",
    bg: "bg-red-50 border-red-100",
    rules: [
      "Do not disable or tamper with smoke detectors, carbon monoxide detectors, or fire extinguishers.",
      "In case of fire or emergency, call 911 immediately.",
      "Do not use outdoor grills or fire pits indoors under any circumstances.",
      "Candles may only be used with proper supervision and must be extinguished before sleeping.",
    ],
  },
];

const CONSEQUENCES = [
  { label: "Smoking indoors", fee: "$250 minimum cleaning fee" },
  { label: "Unauthorized pet", fee: "$150 per pet, per night" },
  { label: "Unauthorized party/event", fee: "Immediate termination, no refund" },
  { label: "Late check-out (without approval)", fee: "Up to one additional night's rate" },
  { label: "Excessive damage", fee: "Full cost of repair or replacement" },
  { label: "Violation of occupancy limits", fee: "Immediate termination, no refund" },
];

export default function HouseRulesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-28 pb-10 bg-foreground text-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-background/60 hover:text-background text-sm mb-6 transition-colors"
              style={{ fontFamily: "var(--font-body)" }}>
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </Link>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1
                className="text-4xl lg:text-5xl font-light text-background mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                House Rules
                <br />
                <em className="italic text-background/70">for All Properties</em>
              </h1>
              <p className="text-background/60 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                These rules apply to all Rose City Stays properties in Tyler, Texas. By booking, you agree to follow them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notice */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-amber-800 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            <strong>Please read carefully.</strong> These house rules are part of the Rose City Stays Short-Term Rental Agreement and are legally binding. Violations may result in immediate termination of your stay without refund and/or additional charges.
          </p>
        </div>
      </div>

      {/* Rules Grid */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {RULE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.title}
                className={`rounded-xl border p-5 ${category.bg}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 ${category.color}`} />
                  <h3
                    className="font-medium text-foreground"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {category.title}
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {category.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span
                        className="text-sm text-foreground/75 leading-snug"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {rule}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Consequences Table */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2
              className="text-xl font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Violation Fees & Consequences
            </h2>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-body)" }}>
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-5 py-3 font-medium text-foreground/70">Violation</th>
                  <th className="text-left px-5 py-3 font-medium text-foreground/70">Consequence</th>
                </tr>
              </thead>
              <tbody>
                {CONSEQUENCES.map((row, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                    <td className="px-5 py-3 text-foreground/80">{row.label}</td>
                    <td className="px-5 py-3 text-foreground/80 font-medium">{row.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link href="/rental-agreement">
            <Button
              variant="outline"
              className="rounded-full px-6"
              style={{ fontFamily: "var(--font-body)" }}
            >
              View Full Rental Agreement
            </Button>
          </Link>
          <Link href="/#properties">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Browse Properties & Book
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          These house rules apply to all Rose City Stays properties in Tyler, Texas. Individual properties may have additional rules specific to that property, which will be displayed on the property listing page. By completing a booking, you agree to both these general rules and any property-specific rules.
        </p>
      </main>

      <Footer />
    </div>
  );
}
