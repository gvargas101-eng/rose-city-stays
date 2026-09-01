/**
 * ManualBookingPay — Guest-facing payment page for admin-created booking links.
 *
 * URL: /booking/pay/:token
 *
 * Flow:
 *  1. Load booking details from token
 *  2. Show price breakdown (including custom line items)
 *  3. Show guest note (if any) in an amber info box
 *  4. Conditionally show each hard stop (camera, guest count, T&C, ID upload)
 *     based on bypass flags set by the admin
 *  5. On "Pay Now", create Stripe Checkout Session and redirect
 *
 * Bug fix: guestName/guestEmail inputs are pre-filled from link.guestName/link.guestEmail
 * so the Pay Now button is not greyed out when the admin has pre-filled them.
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck,
  Camera,
  Users,
  FileText,
  CreditCard,
  CheckCircle2,
  Upload,
  Loader2,
  CalendarDays,
  BedDouble,
  AlertTriangle,
  ExternalLink,
  Tag,
  MessageSquare,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ManualBookingPay() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();

  // Form state — pre-filled once link data loads
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Hard-stop acknowledgment state
  const [ackCamera, setAckCamera] = useState(false);
  const [ackGuestCount, setAckGuestCount] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);

  // ID upload state
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load booking link
  const { data: link, isLoading, error } = trpc.booking.getManualBookingLink.useQuery(
    { token: token! },
    { enabled: !!token, retry: false }
  );

  // Pre-fill guest name/email from link data once loaded
  useEffect(() => {
    if (link && !prefilled) {
      if (link.guestName) setGuestName(link.guestName);
      if (link.guestEmail) setGuestEmail(link.guestEmail);
      setPrefilled(true);
    }
  }, [link, prefilled]);

  // Checkout mutation
  const checkoutMutation = trpc.booking.createManualBookingCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (err) => {
      setSubmitError(err.message || "Failed to create checkout session");
      setSubmitting(false);
    },
  });

  // ── ID Upload ──────────────────────────────────────────────────────────────

  async function handleIdUpload(file: File) {
    setIdError(null);
    setIdFile(file);
    setIdUploading(true);

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setIdError(`File too large (max ${MAX_MB} MB)`);
      setIdUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("idFile", file);
      const res = await fetch("/api/upload/guest-id", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      setIdUrl(json.url);
    } catch {
      setIdError("Upload failed. Please try again.");
      setIdFile(null);
    } finally {
      setIdUploading(false);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!link) return;

    // Validate name/email
    if (!guestName.trim()) return toast.error("Please enter your name");
    if (!guestEmail.trim()) return toast.error("Please enter your email");

    // Validate hard stops (only those not bypassed)
    if (!link.bypassCameraDisclosure && !ackCamera) {
      return toast.error("Please acknowledge the camera disclosure");
    }
    if (!link.bypassGuestCount && !ackGuestCount) {
      return toast.error("Please confirm your guest count is accurate");
    }
    if (!link.bypassTermsAcceptance && !ackTerms) {
      return toast.error("Please accept the terms and house rules");
    }
    if (!link.bypassIdUpload && !idUrl) {
      return toast.error("Please upload a government-issued photo ID");
    }

    setSubmitting(true);
    setSubmitError(null);

    checkoutMutation.mutate({
      token: token!,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestIdUrl: idUrl ?? undefined,
      origin: window.location.origin,
      guestPhone: guestPhone.trim() || undefined,
    });
  }

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render: Error / Invalid ────────────────────────────────────────────────

  if (error || !link) {
    const msg = (error as any)?.message ?? "This booking link is invalid or has expired.";
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Link Unavailable
          </h1>
          <p className="text-muted-foreground mb-6" style={{ fontFamily: "var(--font-body)" }}>{msg}</p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Render: Main ──────────────────────────────────────────────────────────

  // Determine which steps are required
  const requireCamera = !link.bypassCameraDisclosure;
  const requireGuestCount = !link.bypassGuestCount;
  const requireTerms = !link.bypassTermsAcceptance;
  const requireId = !link.bypassIdUpload;

  // Security deposit amount for this booking (override or global)
  const depositAmount = link.securityDepositOverride ?? 500;

  // Can submit?
  const canSubmit =
    guestName.trim() &&
    guestEmail.trim() &&
    guestPhone.trim() &&
    (!requireCamera || ackCamera) &&
    (!requireGuestCount || ackGuestCount) &&
    (!requireTerms || ackTerms) &&
    (!requireId || !!idUrl);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">

        {/* ── Header ── */}
        <div>
          <div className="flex items-center gap-2 text-primary text-xs tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-body)" }}>
            <ShieldCheck className="w-4 h-4" />
            Secure Booking Link
          </div>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground mt-2" style={{ fontFamily: "var(--font-body)" }}>
            {link.propertyName}
          </p>
        </div>

        {/* ── Guest Note (if present) ── */}
        {link.guestNote && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold mb-1">Note from your host</div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{link.guestNote}</p>
            </div>
          </div>
        )}

        {/* ── Booking Summary ── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>Booking Summary</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Check-in</div>
                <div className="font-medium text-foreground">{fmtDate(link.checkIn)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Check-out</div>
                <div className="font-medium text-foreground">{fmtDate(link.checkOut)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BedDouble className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-medium text-foreground">{link.nights} night{link.nights !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Guests</div>
                <div className="font-medium text-foreground">{link.guestCount} guest{link.guestCount !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{fmt(link.nightlyRate)} × {link.nights} night{link.nights !== 1 ? "s" : ""}</span>
              <span>{fmt(Number(link.nightlyRate) * link.nights)}</span>
            </div>
            {Number(link.cleaningFee) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Cleaning fee</span>
                <span>{fmt(link.cleaningFee)}</span>
              </div>
            )}
            {Number(link.extraGuestFee) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Extra guest fee</span>
                <span>{fmt(link.extraGuestFee)}</span>
              </div>
            )}
            {/* Custom line items */}
            {link.customLineItems && link.customLineItems.length > 0 && link.customLineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>{item.label}</span>
                <span>{fmt(item.amount)}</span>
              </div>
            ))}
            {Number(link.discountAmount) > 0 && (
              <div className="flex justify-between text-green-700">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {link.discountLabel || "Discount"}</span>
                <span>−{fmt(link.discountAmount)}</span>
              </div>
            )}
            {Number(link.taxAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Taxes & fees</span>
                <span>{fmt(link.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-foreground text-base pt-2 border-t border-border">
              <span>Total</span>
              <span>{fmt(link.totalAmount)}</span>
            </div>
          </div>

          {/* Security deposit notice — uses override if set */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              A <strong>{fmt(depositAmount)} security deposit hold</strong> will be placed on your card after payment. This is an authorization only — not a charge — and will be released within 3–5 business days after checkout if no damages are reported.
            </span>
          </div>
        </div>

        {/* ── Guest Info ── */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>Your Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name *</label>
                <Input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address *</label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone Number *</label>
                <Input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required
                />
              </div>
            </div>
            {(link.guestName || link.guestEmail) && (
              <p className="text-xs text-muted-foreground">
                Your information has been pre-filled by your host. Please verify it is correct before proceeding.
              </p>
            )}
          </div>

          {/* ── Hard Stops ── */}
          {(requireId || requireCamera || requireGuestCount || requireTerms) && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>
                Required Acknowledgments
              </h2>

              {/* ID Upload */}
              {requireId && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Government-Issued Photo ID
                  </div>
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                    Upload a clear photo of your government-issued ID (passport, driver's license, or state ID). Your ID must match the name on the credit card used for payment. This is required for identity verification and security purposes.
                  </p>
                  {!idUrl ? (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                      idError ? "border-red-300 bg-red-50" : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}>
                      {idUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {idUploading ? "Uploading…" : "Click to upload ID (JPEG, PNG, PDF — max 10 MB)"}
                      </span>
                      {idError && <span className="text-xs text-red-600">{idError}</span>}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleIdUpload(f);
                        }}
                        disabled={idUploading}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-green-800">ID uploaded successfully</div>
                        <div className="text-xs text-green-700 truncate">{idFile?.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIdUrl(null); setIdFile(null); }}
                        className="text-xs text-green-700 hover:text-green-900 underline shrink-0"
                      >
                        Replace
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Disclosure */}
              {requireCamera && (
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  ackCamera ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"
                }`}>
                  <input
                    type="checkbox"
                    checked={ackCamera}
                    onChange={e => setAckCamera(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      Outdoor Security Cameras
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      I acknowledge that this property has outdoor security cameras at entry points (front door, driveway, and exterior access areas) for security and guest count verification. Cameras do not monitor interior spaces.
                    </p>
                  </div>
                </label>
              )}

              {/* Guest Count */}
              {requireGuestCount && (
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  ackGuestCount ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"
                }`}>
                  <input
                    type="checkbox"
                    checked={ackGuestCount}
                    onChange={e => setAckGuestCount(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Guest Count Accuracy
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      I confirm that the guest count of <strong>{link.guestCount}</strong> is accurate and includes all individuals who will be on the property. I understand that undisclosed guests may result in additional charges or cancellation of the reservation.
                    </p>
                  </div>
                </label>
              )}

              {/* Terms & Conditions */}
              {requireTerms && (
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  ackTerms ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"
                }`}>
                  <input
                    type="checkbox"
                    checked={ackTerms}
                    onChange={e => setAckTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Terms, Rental Agreement & House Rules
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
                      I have read and agree to the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                        Terms & Conditions <ExternalLink className="w-3 h-3" />
                      </a>
                      ,{" "}
                      <a href="/rental-agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                        Rental Agreement <ExternalLink className="w-3 h-3" />
                      </a>
                      , and{" "}
                      <a href="/house-rules" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                        House Rules <ExternalLink className="w-3 h-3" />
                      </a>
                      .
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* ── Submit Error ── */}
          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          {/* ── Pay Button ── */}
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || submitting}
            className="w-full gap-2 rounded-full py-6 text-base font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to Secure Payment…
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Pay {fmt(link.totalAmount)} Securely
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            You will be redirected to Stripe's secure checkout. Your card information is never stored on our servers.
          </p>
        </form>
      </div>

      <Footer />
    </div>
  );
}
