/**
 * CheckoutModal — Stripe Elements payment form in a modal dialog
 * Collects guest info + card details, creates PaymentIntent, confirms payment
 */

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Lock, CalendarDays, Users, Home } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutModalProps {
  propertyId: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  avgNightlyRate: number;
  guestCount: number;
  cleaningFee: number;
  subtotal: number;
  totalAmount: number;
  onClose: () => void;
}

// Inner form that uses Stripe hooks (must be inside <Elements>)
function CheckoutForm({
  propertyId,
  propertyName,
  checkIn,
  checkOut,
  nights,
  avgNightlyRate,
  guestCount,
  cleaningFee,
  subtotal,
  totalAmount,
  clientSecret,
  onClose,
}: CheckoutModalProps & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"info" | "payment">("info");

  const confirmBooking = trpc.booking.confirmBooking.useMutation();

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    setStep("payment");
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: guestName,
              email: guestEmail,
              phone: guestPhone || undefined,
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Confirm booking and create Hostaway reservation
        await confirmBooking.mutateAsync({ paymentIntentId: paymentIntent.id });
        toast.success("Booking confirmed! Check your email for details.");
        navigate(`/booking/confirmation?pi=${paymentIntent.id}`);
        onClose();
      }
    } catch (err) {
      toast.error("Something went wrong. Please contact us directly.");
      console.error("[Checkout] Error:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Complete Your Booking
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Booking summary */}
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <div className="flex items-start gap-3">
          <Home className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <div className="font-medium text-foreground">{propertyName}</div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(checkIn, "MMM d")} – {format(checkOut, "MMM d, yyyy")} · {nights} nights
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {guestCount} guests
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>${avgNightlyRate} × {nights} nights</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Cleaning fee</span>
            <span>${cleaningFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border mt-1">
            <span>Total (USD)</span>
            <span>${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto p-6">
        {step === "info" ? (
          <form onSubmit={handleInfoSubmit} className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Your Information</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                <Input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email Address *</label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone (optional)</label>
                <Input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Special Requests (optional)</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Early check-in, late check-out, etc."
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-5">
              Continue to Payment
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Payment Details</h3>
              <button
                type="button"
                onClick={() => setStep("info")}
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
              >
                ← Back
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Booking for <strong className="text-foreground">{guestName}</strong> · {guestEmail}
            </div>
            <div className="border border-border rounded-xl p-4 bg-background">
              <PaymentElement
                options={{
                  layout: "tabs",
                  fields: {
                    billingDetails: {
                      name: "never",
                      email: "never",
                    },
                  },
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>Secured by Stripe. Your card details are never stored on our servers.</span>
            </div>
            <Button
              type="submit"
              disabled={!stripe || processing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-5 text-base"
            >
              {processing ? "Processing…" : `Pay $${totalAmount.toLocaleString()} — Confirm Booking`}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Use test card: <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code> · Any future date · Any CVC
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// Outer wrapper — fetches clientSecret then mounts Elements
export default function CheckoutModal(props: CheckoutModalProps) {
  const createPaymentIntent = trpc.booking.createPaymentIntent.useMutation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Trigger payment intent creation when modal mounts
  const initPayment = async () => {
    if (clientSecret || loading) return;
    setLoading(true);
    try {
      const result = await createPaymentIntent.mutateAsync({
        propertyId: props.propertyId,
        propertyName: props.propertyName,
        checkIn: format(props.checkIn, "yyyy-MM-dd"),
        checkOut: format(props.checkOut, "yyyy-MM-dd"),
        nights: props.nights,
        nightlyRate: props.avgNightlyRate,
        guestCount: props.guestCount,
        guestName: "Pending",
        guestEmail: "pending@placeholder.com",
        message: "",
      });
      setClientSecret(result.clientSecret);
    } catch (err) {
      setError("Unable to initialize payment. Please try again.");
      console.error("[CheckoutModal] Payment intent error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-init on mount
  if (!clientSecret && !loading && !error) {
    initPayment();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={props.onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={props.onClose} variant="outline">Close</Button>
          </div>
        )}

        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#b76e79",
                  borderRadius: "8px",
                  fontFamily: "var(--font-body)",
                },
              },
            }}
          >
            <CheckoutForm {...props} clientSecret={clientSecret} />
          </Elements>
        )}
      </div>
    </div>
  );
}
