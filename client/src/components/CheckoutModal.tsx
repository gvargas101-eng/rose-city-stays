/**
 * CheckoutModal — Stripe Elements payment form in a modal dialog
 * Flow:
 *   Step 1: Guest fills in name/email/phone/message
 *   Step 2: Submit info → createPaymentIntent (with real guest data) → mount Stripe Elements
 *   Step 3: Guest enters card → confirmPayment → confirmBooking → redirect to /booking/confirmation
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
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  onClose: () => void;
}

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// ── Step 2: Stripe payment form (mounted only after PaymentIntent is created) ──
function PaymentStep({
  guestInfo,
  totalAmount,
  clientSecret,
  paymentIntentId,
  onBack,
  onClose,
}: {
  guestInfo: GuestInfo;
  totalAmount: number;
  clientSecret: string;
  paymentIntentId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [processing, setProcessing] = useState(false);

  const confirmBooking = trpc.booking.confirmBooking.useMutation();

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
              name: guestInfo.name,
              email: guestInfo.email,
              phone: guestInfo.phone || undefined,
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
    <form onSubmit={handlePayment} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Payment Details</h3>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
        >
          ← Back
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        Booking for <strong className="text-foreground">{guestInfo.name}</strong> · {guestInfo.email}
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
  );
}

// ── Outer modal wrapper ──
export default function CheckoutModal(props: CheckoutModalProps) {
  const {
    propertyId, propertyName, checkIn, checkOut,
    nights, avgNightlyRate, guestCount, cleaningFee, subtotal, taxAmount, taxRate, totalAmount, onClose,
  } = props;

  const createPaymentIntent = trpc.booking.createPaymentIntent.useMutation();

  const [step, setStep] = useState<"info" | "payment">("info");
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: "", email: "", phone: "", message: "" });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  // Live fee breakdown from server (updated after PaymentIntent is created with real tax rate)
  const [liveFees, setLiveFees] = useState<{ subtotal: number; cleaningFee: number; taxAmount: number; taxRate: number; totalAmount: number } | null>(null);

  // Called when guest submits their info — creates PaymentIntent with real data
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInfo.name.trim() || !guestInfo.email.trim()) return;

    try {
      const result = await createPaymentIntent.mutateAsync({
        propertyId,
        propertyName,
        checkIn: format(checkIn, "yyyy-MM-dd"),
        checkOut: format(checkOut, "yyyy-MM-dd"),
        nights,
        nightlyRate: avgNightlyRate,
        guestCount,
        guestName: guestInfo.name.trim(),
        guestEmail: guestInfo.email.trim(),
        guestPhone: guestInfo.phone.trim() || undefined,
        message: guestInfo.message.trim() || undefined,
      });
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.bookingId);
      setLiveFees({ subtotal: result.subtotal, cleaningFee: result.cleaningFee, taxAmount: result.taxAmount, taxRate: result.taxRate, totalAmount: result.totalAmount });
      setStep("payment");
    } catch (err) {
      setInitError("Unable to initialize payment. Please try again.");
      console.error("[CheckoutModal] Payment intent error:", err);
    }
  };

  const handleBack = () => {
    setStep("info");
    // Note: we keep clientSecret so we don't create duplicate PaymentIntents
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
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
          {/* Itemized fee breakdown — uses live server values after PaymentIntent created, estimates before */}
          {(() => {
            const fees = liveFees ?? { subtotal, cleaningFee, taxAmount, taxRate, totalAmount };
            const taxPct = Math.round(fees.taxRate * 100);
            return (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>${avgNightlyRate.toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""}</span>
                  <span>${fees.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Cleaning fee</span>
                  <span>${fees.cleaningFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Hotel occupancy tax ({taxPct}%)</span>
                  <span>${fees.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border mt-1">
                  <span>Total (USD)</span>
                  <span>${fees.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6">
          {initError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {initError}
            </div>
          )}

          {step === "info" ? (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Your Information</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                  <Input
                    value={guestInfo.name}
                    onChange={e => setGuestInfo(g => ({ ...g, name: e.target.value }))}
                    placeholder="Jane Smith"
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email Address *</label>
                  <Input
                    type="email"
                    value={guestInfo.email}
                    onChange={e => setGuestInfo(g => ({ ...g, email: e.target.value }))}
                    placeholder="jane@example.com"
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone (optional)</label>
                  <Input
                    type="tel"
                    value={guestInfo.phone}
                    onChange={e => setGuestInfo(g => ({ ...g, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Special Requests (optional)</label>
                  <Textarea
                    value={guestInfo.message}
                    onChange={e => setGuestInfo(g => ({ ...g, message: e.target.value }))}
                    placeholder="Early check-in, late check-out, etc."
                    rows={2}
                    className="bg-background resize-none"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={createPaymentIntent.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-5"
              >
                {createPaymentIntent.isPending ? "Preparing payment…" : "Continue to Payment"}
              </Button>
            </form>
          ) : clientSecret ? (
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
              <PaymentStep
                guestInfo={guestInfo}
                totalAmount={totalAmount}
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId!}
                onBack={handleBack}
                onClose={onClose}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
