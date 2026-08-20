import { CheckCircle2, Home } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ExtensionConfirmation() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container max-w-2xl py-20 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold">Your extension payment was received</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Thank you. Your payment has been submitted and your updated stay details are being confirmed. Rose City Stays will contact you if anything else is needed.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Home className="h-4 w-4" /> Return home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
