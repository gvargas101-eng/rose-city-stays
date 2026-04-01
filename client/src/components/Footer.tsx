// Rose City Stays — Footer
// Design: Rose City Luxe — dark charcoal footer with mauve accents

import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>RC</span>
              </div>
              <span
                className="text-xl font-medium text-background"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Rose City Stays
              </span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed mb-6" style={{ fontFamily: "var(--font-body)" }}>
              Premium short-term and corporate rentals in Tyler, TX. Your home away from home in the Rose Capital of America.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-background/20 flex items-center justify-center text-background/60 hover:text-background hover:border-background/60 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-background/20 flex items-center justify-center text-background/60 hover:text-background hover:border-background/60 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-sm font-medium text-background/40 tracking-widest uppercase mb-5"
              style={{ fontFamily: "var(--font-body)", letterSpacing: "0.15em" }}
            >
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: "All Properties", href: "/#properties" },
                { label: "About Us", href: "/#about" },
                { label: "Why Book Direct", href: "/#why-direct" },
                { label: "Contact", href: "/#contact" },
                { label: "Book on Hostaway", href: "https://www.rosecitystays.com", external: true },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {link.label}
                    {link.external && <span className="ml-1 text-xs">↗</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-medium text-background/40 tracking-widest uppercase mb-5"
              style={{ fontFamily: "var(--font-body)", letterSpacing: "0.15em" }}
            >
              Contact
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:gustavo@rosecitystays.com"
                  className="flex items-center gap-3 text-sm text-background/60 hover:text-background transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <Mail className="w-4 h-4 flex-shrink-0 text-primary" />
                  gustavo@rosecitystays.com
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm text-background/60" style={{ fontFamily: "var(--font-body)" }}>
                  <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
                  Tyler, Texas
                </div>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-background/60" style={{ fontFamily: "var(--font-body)" }}>
                  <Phone className="w-4 h-4 flex-shrink-0 text-primary mt-0.5" />
                  <span>Available via email or booking platform</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-background/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-background/40" style={{ fontFamily: "var(--font-body)" }}>
            © {new Date().getFullYear()} Rose City Stays. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-background/40 hover:text-background/70 transition-colors" style={{ fontFamily: "var(--font-body)" }}>
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-background/40 hover:text-background/70 transition-colors" style={{ fontFamily: "var(--font-body)" }}>
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
