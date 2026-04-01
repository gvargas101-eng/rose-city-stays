// Rose City Stays — 404 Not Found Page
// Design: Rose City Luxe — minimal, on-brand 404

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p
          className="text-9xl font-light mb-4"
          style={{ fontFamily: "var(--font-display)", color: "oklch(0.88 0.04 15)" }}
        >
          404
        </p>
        <h1
          className="text-3xl lg:text-4xl font-light text-foreground mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Page Not Found
        </h1>
        <p
          className="text-base text-muted-foreground mb-8 max-w-md"
          style={{ fontFamily: "var(--font-body)" }}
        >
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Back to Home
            </Button>
          </Link>
          <Link href="/#properties">
            <Button
              variant="outline"
              className="rounded-full px-8 border-border"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Browse Properties
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
