import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Users, Calendar, Wifi, Shield, Clock, CheckCircle2, BedDouble, Star, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PROPERTY_OPTIONS = [
  "No preference — show me all options",
  "The Briar",
  "Wall Ave. Retreat",
  "Rose at Hollytree",
  "The Alamo House",
  "Green Acres",
  "The Legacy House",
  "Azalea Cottage",
  "Noir at Hollytree",
  "Azul at Hollytree",
  "Verde at Hollytree",
  "Cozy 3BR Retreat",
];

const BENEFITS = [
  {
    icon: <Star className="w-5 h-5 text-primary" />,
    title: "Monthly Rate Discounts",
    desc: "Stays of 30+ nights qualify for significantly reduced nightly rates — typically 20–35% off standard pricing.",
  },
  {
    icon: <Wifi className="w-5 h-5 text-primary" />,
    title: "500+ Mbps Wi-Fi",
    desc: "Every property is equipped with blazing-fast internet, ideal for remote work, telehealth, and video conferencing.",
  },
  {
    icon: <Shield className="w-5 h-5 text-primary" />,
    title: "Fully Furnished",
    desc: "Move in with just your suitcase. All linens, kitchenware, and essentials are included — no lease or deposits.",
  },
  {
    icon: <Clock className="w-5 h-5 text-primary" />,
    title: "Flexible Check-In",
    desc: "Self check-in with smart locks. Arrive on your schedule, 24/7, with no front desk required.",
  },
  {
    icon: <Building2 className="w-5 h-5 text-primary" />,
    title: "Ideal for Traveling Professionals",
    desc: "Located near UT Health, Mother Frances Hospital, and Tyler's business district — perfect for medical staff and contractors.",
  },
  {
    icon: <Users className="w-5 h-5 text-primary" />,
    title: "Group & Team Accommodations",
    desc: "Need to house an entire team? We can accommodate multiple properties simultaneously for large groups.",
  },
];

const WHO_WE_SERVE = [
  "Traveling nurses & medical professionals",
  "Corporate relocations & project teams",
  "Insurance-displaced families",
  "Remote workers & digital nomads",
  "Film & production crews",
  "Government & military personnel",
];

export default function CorporateStays() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    propertyPreference: "",
    checkIn: "",
    checkOut: "",
    durationMonths: "",
    guestCount: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.inquiry.submitCorporate.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Inquiry received! We'll be in touch within 24 hours.");
    },
    onError: () => {
      toast.error("Something went wrong. Please email us directly at hello@rosecitystays.com");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    submitMutation.mutate({
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      propertyPreference: form.propertyPreference && form.propertyPreference !== "No preference — show me all options"
        ? form.propertyPreference
        : undefined,
      checkIn: form.checkIn || undefined,
      checkOut: form.checkOut || undefined,
      durationMonths: form.durationMonths ? parseInt(form.durationMonths) : undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/80" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 60%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span
            className="inline-block text-primary text-xs tracking-[0.25em] uppercase border border-primary/40 rounded-full px-4 py-1.5 mb-6"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Corporate & Extended Stays · Tyler, TX
          </span>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 leading-[1.1]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            30+ Night Stays,
            <br />
            <em className="italic text-primary">Built for Professionals</em>
          </h1>
          <p
            className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}
          >
            Premium furnished homes in Tyler, TX — ideal for traveling nurses, corporate teams, and anyone who needs more than a hotel room. Monthly rates, no lease, move-in ready.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-white/60 text-sm" style={{ fontFamily: "var(--font-body)" }}>
            {["10 Properties Available", "4.9★ Average Rating", "Self Check-In 24/7", "Monthly Rate Discounts"].map(t => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs tracking-[0.2em] uppercase text-primary mb-3 block" style={{ fontFamily: "var(--font-body)" }}>
              Why Choose Rose City Stays
            </span>
            <h2 className="text-3xl lg:text-4xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Everything You Need,<br /><em className="italic text-muted-foreground">Nothing You Don't</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-background rounded-xl p-6 border border-border shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  {b.icon}
                </div>
                <h3 className="font-medium text-foreground mb-2" style={{ fontFamily: "var(--font-body)" }}>{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE SERVE ── */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs tracking-[0.2em] uppercase text-primary mb-3 block" style={{ fontFamily: "var(--font-body)" }}>
                Who We Serve
              </span>
              <h2 className="text-3xl font-light text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Trusted by Professionals<br /><em className="italic text-muted-foreground">Across Every Industry</em>
              </h2>
              <ul className="space-y-3">
                {WHO_WE_SERVE.map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/80" style={{ fontFamily: "var(--font-body)" }}>
                    <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/40 rounded-2xl p-8 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <BedDouble className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-body)" }}>Quick Facts</span>
              </div>
              <div className="space-y-4 text-sm" style={{ fontFamily: "var(--font-body)" }}>
                {[
                  ["Minimum Stay", "30 nights for monthly rates"],
                  ["Properties", "10 fully furnished homes"],
                  ["Location", "Tyler, TX — near UT Health & Mother Frances"],
                  ["Internet", "500+ Mbps fiber in every home"],
                  ["Check-In", "Self check-in, 24/7 availability"],
                  ["Response Time", "Within 24 hours of inquiry"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INQUIRY FORM ── */}
      <section id="inquiry-form" className="py-20 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs tracking-[0.2em] uppercase text-primary mb-3 block" style={{ fontFamily: "var(--font-body)" }}>
              Get a Custom Quote
            </span>
            <h2 className="text-3xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Request Extended Stay Rates
            </h2>
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>
              Fill out the form below and we'll respond within 24 hours with available properties and monthly pricing.
            </p>
          </div>

          {submitted ? (
            <div className="bg-background rounded-2xl border border-border p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Inquiry Received!
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto" style={{ fontFamily: "var(--font-body)" }}>
                Thank you for reaching out. We'll review your request and get back to you within 24 hours with available options and monthly rates.
              </p>
              <p className="text-xs text-muted-foreground mt-6" style={{ fontFamily: "var(--font-body)" }}>
                Questions? Email us at <a href="mailto:hello@rosecitystays.com" className="text-primary hover:underline">hello@rosecitystays.com</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-background rounded-2xl border border-border p-8 shadow-sm space-y-5">
              {/* Contact Info */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-body)" }}>
                  Contact Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Full Name <span className="text-primary">*</span>
                    </label>
                    <Input
                      value={form.name}
                      onChange={update("name")}
                      placeholder="Jane Smith"
                      required
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Company / Organization
                    </label>
                    <Input
                      value={form.company}
                      onChange={update("company")}
                      placeholder="UT Health Tyler"
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Email Address <span className="text-primary">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      placeholder="jane@example.com"
                      required
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={update("phone")}
                      placeholder="(903) 555-0100"
                      className="rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Stay Details */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4" style={{ fontFamily: "var(--font-body)" }}>
                  Stay Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Desired Check-in
                    </label>
                    <Input
                      type="date"
                      value={form.checkIn}
                      onChange={update("checkIn")}
                      className="rounded-lg"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Desired Check-out
                    </label>
                    <Input
                      type="date"
                      value={form.checkOut}
                      onChange={update("checkOut")}
                      className="rounded-lg"
                      min={form.checkIn || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Estimated Duration (months)
                    </label>
                    <select
                      value={form.durationMonths}
                      onChange={update("durationMonths")}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <option value="">Select duration</option>
                      {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(m => (
                        <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                      Number of Guests
                    </label>
                    <select
                      value={form.guestCount}
                      onChange={update("guestCount")}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <option value="">Select guests</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Property Preference */}
              <div>
                <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                  Property Preference
                </label>
                <select
                  value={form.propertyPreference}
                  onChange={update("propertyPreference")}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <option value="">Select a property (optional)</option>
                  {PROPERTY_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-foreground mb-1.5" style={{ fontFamily: "var(--font-body)" }}>
                  Additional Notes
                </label>
                <Textarea
                  value={form.notes}
                  onChange={update("notes")}
                  placeholder="Tell us about your stay — purpose of visit, special requirements, pet policy questions, etc."
                  rows={4}
                  className="rounded-lg resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-base font-medium tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {submitMutation.isPending ? "Sending…" : "Submit Inquiry"}
              </Button>

              <p className="text-xs text-center text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                We respond within 24 hours. No commitment required.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
