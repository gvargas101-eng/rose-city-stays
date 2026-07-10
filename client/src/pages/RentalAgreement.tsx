// Rose City Stays — Rental Agreement Page
// Standalone page displaying the full Texas STR lease agreement

import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, FileText, Scale, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RENTAL_AGREEMENT_SECTIONS, RENTAL_AGREEMENT_VERSION } from "@/lib/rentalAgreement";

export default function RentalAgreement() {
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
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1
                className="text-4xl lg:text-5xl font-light text-background mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Short-Term Rental
                <br />
                <em className="italic text-background/70">Lease Agreement</em>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-background/60" style={{ fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Governing law: State of Texas
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Version {RENTAL_AGREEMENT_VERSION}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-amber-800 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            <strong>Important:</strong> This agreement is a legally binding contract under Texas law. By completing a booking on Rose City Stays, you agree to all terms contained herein. Please read this document carefully before proceeding with your reservation.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
            Contents
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {RENTAL_AGREEMENT_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-foreground/60 hover:text-primary transition-colors py-0.5"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Agreement Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10">
          {RENTAL_AGREEMENT_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2
                className="text-xl font-medium text-foreground mb-4 pb-3 border-b border-border"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {section.title}
              </h2>
              <div
                className="text-foreground/80 leading-relaxed space-y-3"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem" }}
              >
                {section.content.split("\n\n").map((paragraph, i) => {
                  // Render bold markdown (**text**) inline
                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i}>
                      {parts.map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={j}>{part.slice(2, -2)}</strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Signature Block */}
        <div className="mt-16 pt-10 border-t border-border">
          <div className="bg-muted/40 rounded-xl p-6 border border-border">
            <h3
              className="text-lg font-medium text-foreground mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Electronic Acceptance
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: "var(--font-body)" }}>
              By completing a booking on Rose City Stays and checking the acknowledgment box at checkout, the Guest provides their electronic signature and agrees to all terms of this Agreement. This electronic acceptance is legally binding under the Texas Uniform Electronic Transactions Act (Tex. Bus. & Com. Code § 322.001 et seq.) and the federal Electronic Signatures in Global and National Commerce Act (E-SIGN Act).
            </p>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              The Guest's name, email address, IP address, and timestamp of acceptance are recorded and stored as evidence of agreement.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href="/house-rules">
              <Button
                variant="outline"
                className="rounded-full px-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                View House Rules
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
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-muted-foreground/60 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          This agreement was prepared for informational purposes and does not constitute legal advice. Rose City Stays recommends that all parties consult with a qualified Texas attorney regarding any legal questions. This document was last updated {RENTAL_AGREEMENT_VERSION}.
        </p>
      </main>

      <Footer />
    </div>
  );
}
