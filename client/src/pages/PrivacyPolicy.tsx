// Rose City Stays — Privacy Policy Page

import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LAST_UPDATED = "August 1, 2026";

const sections = [
  {
    title: "1. Information We Collect",
    content: `When you use the Rose City Stays website or make a booking, we collect the following categories of information:

**Information you provide directly:**
- Full name, email address, and phone number when submitting an inquiry or booking
- Payment card information (processed securely by Stripe — we never store raw card numbers)
- Government-issued photo ID uploaded during the booking verification process
- Special requests, messages, and other communications you send us

**Information collected automatically:**
- Browser type, device type, and operating system
- IP address and approximate geographic location
- Pages visited, time spent on the site, and referring URLs
- Analytics data collected via Umami (privacy-friendly, no cross-site tracking)`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect for the following purposes:

- **To process and manage your booking** — confirming reservations, processing payments, and communicating check-in details
- **To verify your identity** — government ID is collected to confirm your identity matches the payment method on file, in accordance with our guest verification policy
- **To communicate with you** — responding to inquiries, sending booking confirmations, and providing pre-arrival information
- **To comply with legal obligations** — including Texas Hotel Occupancy Tax reporting and any applicable law enforcement requests
- **To improve our service** — analyzing site usage to improve the booking experience and property listings
- **To prevent fraud and protect our properties** — detecting and preventing unauthorized or fraudulent bookings`,
  },
  {
    title: "3. How We Share Your Information",
    content: `We do not sell your personal information. We share your information only in the following limited circumstances:

- **Hostaway (property management system)** — your booking details are transmitted to Hostaway to create and manage your reservation
- **Stripe (payment processor)** — payment information is processed by Stripe in accordance with their Privacy Policy (stripe.com/privacy)
- **Amazon Web Services (S3)** — uploaded documents (including government ID) are stored securely in encrypted S3 storage
- **Legal requirements** — we may disclose information if required by law, court order, or to protect the rights and safety of Rose City Stays, our guests, or the public
- **Business transfers** — in the event of a sale or merger, your information may be transferred as part of that transaction`,
  },
  {
    title: "4. Government ID Storage",
    content: `We collect a copy of your government-issued photo ID as part of our guest verification process. This is required to confirm that the identity of the person booking matches the payment method on file.

Your ID is stored in encrypted cloud storage (Amazon S3) and is accessible only to Rose City Stays management. We retain ID copies for a period of 12 months following your stay, after which they are permanently deleted. We do not share your ID with third parties except as required by law.`,
  },
  {
    title: "5. Security Deposit Hold",
    content: `As part of the booking process, a $500 security deposit hold is placed on your payment card. This is an authorization only — not a charge — and is processed by Stripe. The hold will be released within 3–5 business days after your checkout if no damages are reported.

Your payment card details are processed and stored by Stripe. Rose City Stays does not store your card number, CVV, or expiration date.`,
  },
  {
    title: "6. Cookies and Analytics",
    content: `Our website uses Umami, a privacy-friendly analytics tool, to understand how visitors use our site. Umami does not use cookies, does not track you across other websites, and does not collect personally identifiable information.

We do not use advertising cookies, retargeting pixels, or third-party tracking scripts.`,
  },
  {
    title: "7. Data Retention",
    content: `We retain your personal information for as long as necessary to fulfill the purposes described in this policy:

- **Booking records** — retained for 7 years for tax and legal compliance purposes
- **Government ID copies** — retained for 12 months after your stay, then permanently deleted
- **Inquiry and contact form submissions** — retained for 2 years
- **Analytics data** — aggregated and anonymized; no personally identifiable data is retained`,
  },
  {
    title: "8. Your Rights",
    content: `You have the following rights regarding your personal information:

- **Access** — you may request a copy of the personal information we hold about you
- **Correction** — you may request that we correct inaccurate information
- **Deletion** — you may request that we delete your personal information, subject to legal retention requirements
- **Portability** — you may request your data in a portable format

To exercise any of these rights, contact us at gustavo@rosecitystays.com. We will respond within 30 days.`,
  },
  {
    title: "9. Children's Privacy",
    content: `Our website is not directed at children under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.`,
  },
  {
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page. We encourage you to review this policy periodically. Continued use of our website after changes are posted constitutes your acceptance of the updated policy.`,
  },
  {
    title: "11. Contact Us",
    content: `If you have questions about this Privacy Policy or how we handle your personal information, please contact us:

**Rose City Stays**
Tyler, Texas
Email: gustavo@rosecitystays.com
Phone: (903) 714-4305`,
  },
];

export default function PrivacyPolicy() {
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1
                className="text-4xl lg:text-5xl font-light text-background mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Privacy
                <br />
                <em className="italic text-background/70">Policy</em>
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
            Rose City Stays ("we," "us," or "our") operates the website at rosecitystays.com and provides short-term rental
            accommodations in Tyler, Texas. This Privacy Policy explains how we collect, use, and protect your personal
            information when you use our website or book a stay with us. By using our website, you agree to the practices
            described in this policy.
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
                  className="text-sm text-muted-foreground leading-relaxed space-y-3 whitespace-pre-line"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {section.content.split("\n\n").map((para, i) => {
                    // Render bold markdown (**text**)
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
