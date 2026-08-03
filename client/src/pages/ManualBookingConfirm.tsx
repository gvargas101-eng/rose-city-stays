/**
 * ManualBookingConfirm — Confirmation page after a manual booking is paid.
 * URL: /booking/manual-confirm?token=...&session_id=...
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertTriangle, CalendarDays, Users, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function fmt(n: number | string) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
}

export default function ManualBookingConfirm() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const sessionId = params.get("session_id") ?? "";

  const [confirmed, setConfirmed] = useState(false);

  const confirmMutation = trpc.booking.confirmManualBooking.useMutation({
    onSuccess: () => setConfirmed(true),
    onError: () => setConfirmed(false),
  });

  useEffect(() => {
    if (token && sessionId && !confirmed) {
      confirmMutation.mutate({ token, sessionId });
    }
  }, [token, sessionId]);

  if (confirmMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Confirming your booking…</p>
        </div>
      </div>
    );
  }

  if (confirmMutation.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Confirmation Issue
          </h1>
          <p className="text-muted-foreground mb-6" style={{ fontFamily: "var(--font-body)" }}>
            Your payment was received but we had trouble confirming your booking automatically. Please contact us and we will sort it out right away.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const data = confirmMutation.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-16 space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              You're Booked!
            </h1>
            <p className="text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>
              {data?.propertyName ?? "Your reservation"} is confirmed. A receipt has been sent to your email.
            </p>
          </div>
        </div>

        {data && (
          <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>Booking Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Check-in</div>
                  <div className="font-medium">{data.checkIn ? fmtDate(data.checkIn) : "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Check-out</div>
                  <div className="font-medium">{data.checkOut ? fmtDate(data.checkOut) : "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Guests</div>
                  <div className="font-medium">{data.guestCount}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Paid</div>
                <div className="font-semibold text-foreground">{data.totalAmount != null ? fmt(data.totalAmount) : "—"}</div>
              </div>
            </div>

            {/* Deposit hold notice */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                A <strong>$500 security deposit hold</strong> has been placed on your card. This is an authorization only — not a charge — and will be released within 3–5 business days after checkout if no damages are reported.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={() => navigate("/")} className="w-full rounded-full">
            Back to Home
          </Button>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            Questions? Contact us at{" "}
            <a href="mailto:info@rosecitystays.com" className="text-primary hover:underline">
              info@rosecitystays.com
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
