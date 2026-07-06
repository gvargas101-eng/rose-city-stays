// Rose City Stays — Navbar
// Design: Rose City Luxe — minimal top bar, logo left, nav right
// Transparent on hero, solid on scroll

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  // Check standalone admin session for admin link visibility
  const { data: adminSession } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const isAdmin = adminSession?.authenticated === true;

  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // After navigating to home, scroll to the target hash section
  useEffect(() => {
    const hash = window.location.hash;
    if (isHome && hash) {
      // Small delay to allow the page to render before scrolling
      const timer = setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isHome]);

  /**
   * Handle clicks on hash links:
   * - If already on the home page, smooth-scroll to the section without a full navigation.
   * - If on another page, navigate to / with the hash so the useEffect above can scroll.
   */
  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return; // not a hash link — let default behavior handle it

    e.preventDefault();
    const hash = href.slice(hashIndex); // e.g. "#about"

    if (isHome) {
      // Already on home page — just scroll
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      // Navigate to home with hash; the useEffect above will scroll after render
      navigate("/");
      // Push the hash into the URL so the effect can read it
      setTimeout(() => {
        window.location.hash = hash;
      }, 50);
    }

    setMenuOpen(false);
  };

  const navLinks = [
    { href: "/#properties", label: "Properties" },
    { href: "/blog", label: "Blog" },
    { href: "/corporate-stays", label: "Corporate Stays" },
    { href: "/my-bookings", label: "My Bookings" },
    { href: "/#about", label: "About" },
    { href: "/#why-direct", label: "Why Book Direct" },
    { href: "/#contact", label: "Contact" },
  ];

  const transparent = isHome && !scrolled && !menuOpen;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold" style={{ fontFamily: "var(--font-display)" }}>RC</span>
              </div>
              <div>
                <span
                  className={`text-lg font-medium tracking-wide transition-colors ${
                    transparent ? "text-white" : "text-foreground"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Rose City Stays
                </span>
                <p className={`text-xs tracking-widest uppercase transition-colors hidden sm:block ${transparent ? "text-white/70" : "text-muted-foreground"}`}
                  style={{ fontFamily: "var(--font-body)", letterSpacing: "0.12em" }}>
                  Tyler, Texas
                </p>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleHashLink(e, link.href)}
                className={`text-sm font-medium tracking-wide transition-colors hover:text-primary ${
                  transparent ? "text-white/90 hover:text-white" : "text-foreground/70 hover:text-foreground"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {link.label}
              </a>
            ))}

            <a href="/#properties" onClick={(e) => handleHashLink(e, "/#properties")}>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 text-sm font-medium tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Book Now
              </Button>
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 rounded-md transition-colors ${
              transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2"
                style={{ fontFamily: "var(--font-body)" }}
                onClick={(e) => handleHashLink(e, link.href)}
              >
                {link.label}
              </a>
            ))}

            <a href="/#properties" onClick={(e) => { handleHashLink(e, "/#properties"); }}>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Book Now
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
