// Rose City Stays — Terms & Conditions Page

import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Scale, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LAST_UPDATED = "August 1, 2026";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using the Rose City Stays website (rosecitystays.com) or making a booking through our platform, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website or services.

These Terms and Conditions apply to all visitors, guests, and users of the Rose City Stays website and booking platform. We reserve the right to update these terms at any time, and continued use of our services after changes are posted constitutes acceptance of the updated terms.`,
  },
  {
    title: "2. Booking and Reservations",
    content: `**Eligibility:** You must be at least 18 years of age to make a booking. By completing a booking, you represent that you are 18 or older and have the legal authority to enter into this agreement.

**Booking confirmation:** A reservation is confirmed only upon receipt of full payment and issuance of a booking confirmation number. We reserve the right to decline any booking at our discretion.

**Accuracy of information:** You agree to provide accurate and complete information when making a booking. Providing false information, including misrepresenting the number of guests, may result in immediate termination of your stay without refund.

**Occupancy limits:** Each property has a maximum occupancy limit as stated on the property listing. Exceeding the maximum occupancy without prior written approval is a material breach of these terms and may result in immediate eviction without refund.`,
  },
  {
    title: "3. Payment and Fees",
    content: `**Payment processing:** All payments are processed securely by Stripe. By providing your payment information, you authorize Rose City Stays to charge the total booking amount, including nightly rate, cleaning fee, applicable taxes, and any other fees disclosed at checkout.

**Hotel Occupancy Tax:** Direct bookings through rosecitystays.com are subject to Texas Hotel Occupancy Tax (currently 9% — 6% state + local). This tax is included in the total shown at checkout.

**Security deposit hold:** A $500 security deposit hold will be placed on your payment card at the time of booking. This is an authorization hold, not a charge. The hold will be released within 3–5 business days after checkout if no damages are reported. If damages are found, Rose City Stays reserves the right to capture all or part of the $500 hold.

**Pricing:** Nightly rates are subject to change and are confirmed at the time of booking. The total price shown at checkout is the final price for your stay.`,
  },
  {
    title: "4. Cancellation and Refund Policy",
    content: `**Standard cancellation policy:**
- Cancellations made 14 or more days before check-in: full refund of the nightly rate (cleaning fee and taxes are non-refundable)
- Cancellations made 7–13 days before check-in: 50% refund of the nightly rate
- Cancellations made less than 7 days before check-in: no refund

**No-show policy:** If you fail to check in on your scheduled arrival date without prior notice, the booking will be treated as a no-show and no refund will be issued.

**Early departure:** No refund is provided for early departures.

**Force majeure:** In the event of natural disasters, government-mandated evacuations, or other extraordinary circumstances beyond our control, we will work with you in good faith to reschedule or provide a credit. Refunds in such cases are at our discretion.

To request a cancellation, contact us at gustavo@rosecitystays.com or (903) 714-4305.`,
  },
  {
    title: "5. Guest Verification",
    content: `**ID requirement:** All guests are required to upload a valid government-issued photo ID (driver's license, passport, or state ID) prior to completing their booking. The ID must match the name and payment method used for the booking.

**Purpose:** ID verification is conducted to protect our properties, comply with local regulations, and ensure the safety of all guests and neighbors.

**Refusal:** Failure to provide a valid ID will result in cancellation of the booking. In such cases, the cancellation policy in Section 4 applies.`,
  },
  {
    title: "6. House Rules and Guest Conduct",
    content: `All guests agree to comply with the House Rules for each property, which are provided on the property detail page and at /house-rules. Key rules include:

- No smoking inside any property
- No unauthorized pets (unless the property is listed as pet-friendly)
- No parties, events, or gatherings exceeding the maximum occupancy
- Quiet hours from 10:00 PM to 8:00 AM
- No illegal activities on the premises
- Respect for neighbors and surrounding community

Violation of house rules may result in immediate termination of your stay without refund, and you may be held liable for any resulting damages or costs.`,
  },
  {
    title: "7. Property Damage",
    content: `**Guest responsibility:** You are responsible for any damage to the property, its contents, or furnishings caused by you or your guests during your stay.

**Reporting damage:** If you discover any pre-existing damage upon arrival, you must report it to us within 2 hours of check-in to avoid liability.

**Security deposit:** Damages may be charged against the $500 security deposit hold. If damages exceed $500, you agree to pay the additional amount within 14 days of receiving a damage invoice.

**Excessive cleaning:** If the property requires excessive cleaning beyond normal use, an additional cleaning fee may be charged.`,
  },
  {
    title: "8. Check-In and Check-Out",
    content: `**Check-in time:** 4:00 PM (unless otherwise specified on your booking confirmation). Early check-in may be available upon request and subject to availability.

**Check-out time:** 11:00 AM (unless otherwise specified). Late check-out may be available upon request and may incur an additional fee.

**Self check-in:** All Rose City Stays properties offer self check-in via smart lock or lockbox. Check-in instructions will be provided in your booking confirmation email.

**Key return:** All keys, access cards, or lock codes must be secured upon departure. Loss of access devices may result in a replacement fee.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `Rose City Stays provides properties in good faith and makes every effort to ensure they are safe, clean, and as described. However, we cannot guarantee that the property will be free from all defects or that all amenities will be available at all times.

To the maximum extent permitted by Texas law, Rose City Stays shall not be liable for:
- Personal injury or property damage occurring on the premises, except where caused by our gross negligence
- Loss or theft of personal belongings
- Disruptions caused by third parties, including neighbors, utility outages, or construction
- Inaccuracies in property descriptions or photos that do not materially affect the value of your stay

Our total liability to you for any claim arising from your use of our services shall not exceed the total amount paid by you for the booking in question.`,
  },
  {
    title: "10. Intellectual Property",
    content: `All content on the Rose City Stays website — including text, photographs, logos, and design — is the property of Rose City Stays or its licensors and is protected by copyright law. You may not reproduce, distribute, or use any content from this website without our prior written permission.`,
  },
  {
    title: "11. Governing Law and Disputes",
    content: `These Terms and Conditions are governed by the laws of the State of Texas. Any disputes arising from your use of our services or these terms shall be resolved in the courts of Smith County, Texas.

Before initiating any legal action, you agree to contact us in good faith to attempt to resolve the dispute informally. Contact us at gustavo@rosecitystays.com or (903) 714-4305.`,
  },
  {
    title: "12. Contact Information",
    content: `For questions about these Terms and Conditions, please contact:

**Rose City Stays**
Tyler, Texas
Email: gustavo@rosecitystays.com
Phone: (903) 714-4305
Website: rosecitystays.com`,
  },
];

export default function TermsAndConditions() {
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
            <a
              className="inline-flex items-center gap-2 text-background/60 hover:text-background text-sm mb-6 transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </Link>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1
                className="text-4xl lg:text-5xl font-light text-background mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Terms &amp;
                <br />
                <em className="italic text-background/70">Conditions</em>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-background/60" style={{ fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Last updated: {LAST_UPDATED}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-8 bg-muted/30 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            These Terms and Conditions govern your use of the Rose City Stays website and booking platform. Please read
            them carefully before making a reservation. By completing a booking, you agree to be bound by these terms,
            our Privacy Policy, and the House Rules applicable to your property.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {sections.map((section) => (
              <div key={section.title} className="border-b border-border pb-10 last:border-0">
                <h2
                  className="text-xl font-medium text-foreground mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {section.title}
                </h2>
                <div
                  className="text-sm text-muted-foreground leading-relaxed space-y-3"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {section.content.split("\n\n").map((para, i) => {
                    const parts = para.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i}>
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j} className="text-foreground font-medium">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
