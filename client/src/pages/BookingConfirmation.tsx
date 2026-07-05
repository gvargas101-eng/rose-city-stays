/**
 * BookingConfirmation — shown after successful Stripe Checkout payment
 * Supports:
 *   - ?session_id=cs_xxx  (new Stripe Checkout flow)
 *   - ?pi=pi_xxx          (legacy PaymentIntent flow — kept for old links)
 */

import { useSearch } from "wouter";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarDays, Users, Home, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { properties } from "@/lib/properties";

export default function BookingConfirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id") || "";
  const paymentIntentId = params.get("pi") || "";

  // Prefer session_id (new flow), fall back to pi (legacy)
  const useSession = !!sessionId;
  const useLegacy = !useSession && !!paymentIntentId;

  const { data: sessionBooking, isLoading: sessionLoading } =
    trpc.booking.getByCheckoutSession.useQuery(
      { sessionId },
      { enabled: useSession }
    );

  const { data: legacyBooking, isLoading: legacyLoading } =
    trpc.booking.getByPaymentIntent.useQuery(
      { paymentIntentId },
      { enabled: useLegacy }
    );

  const booking = useSession ? sessionBooking : legacyBooking;
  const isLoading = useSession ? sessionLoading : legacyLoading;
  const confirmationRef = useSession ? sessionId : paymentIntentId;

  const property = booking
    ? properties.find((p) => p.id === booking.propertyId)
    : null;

  if (!sessionId && !paymentIntentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No booking found.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Confirming your booking…</p>
          </div>
        ) : !booking ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Booking not found.</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>
              </div>
              <h1
                className="text-3xl font-light text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Booking Confirmed!
              </h1>
              <p className="text-muted-foreground">
                Thank you, <strong className="text-foreground">{booking.guestName}</strong>. Your
                reservation is confirmed and a receipt has been sent to{" "}
                <strong className="text-foreground">{booking.guestEmail}</strong>.
              </p>
            </div>

            {/* Booking details card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Property image */}
              {property && property.images[0] && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">
                      {property?.name || booking.propertyId}
                    </div>
                    <div className="text-sm text-muted-foreground">Tyler, Texas</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                      Check-in
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {format(new Date(booking.checkIn), "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">After 3:00 PM</div>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                      Check-out
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {format(new Date(booking.checkOut), "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">By 11:00 AM</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    {booking.guestCount} guests · {booking.nights} nights
                  </span>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      ${Number(booking.nightlyRate).toFixed(0)} × {booking.nights} nights
                    </span>
                    <span>
                      ${(Number(booking.nightlyRate) * booking.nights).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cleaning fee</span>
                    <span>${Number(booking.cleaningFee).toLocaleString()}</span>
                  </div>
                  {booking.taxAmount && Number(booking.taxAmount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes</span>
                      <span>${Number(booking.taxAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
                    <span>Total paid</span>
                    <span>${Number(booking.totalAmount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Confirmation number */}
                <div className="bg-primary/10 rounded-xl p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Confirmation Reference</div>
                  <div className="font-mono text-xs font-medium text-foreground break-all">
                    {confirmationRef}
                  </div>
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-medium text-foreground">What Happens Next</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    You'll receive a confirmation email with check-in instructions and access
                    details within 24 hours.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    Self check-in is available 24/7. All properties have keypad entry — no need to
                    coordinate arrival times.
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
              <Link href="/#contact" className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Contact Host <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
