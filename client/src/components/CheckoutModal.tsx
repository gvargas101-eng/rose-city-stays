/**
 * CheckoutModal — Guest info form that redirects to Stripe Checkout
 * Flow:
 *   Step 1: Guest fills in name/email/phone/message
 *   Step 2: Guest uploads a government-issued photo ID (required for verification)
 *   Step 3: Guest reads and agrees to rental agreement + house rules (HARD STOP)
 *   Step 4: Submit info → createCheckoutSession → redirect to Stripe hosted checkout
 *   Step 5: Stripe handles card + promo codes → redirects to /booking/confirmation?session_id=cs_xxx
 */

import { useState, useRef } from "react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  CalendarDays,
  Users,
  Home,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckSquare,
  Square,
  Upload,
  CheckCircle2,
  Loader2,
  IdCard,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AGREEMENT_ACKNOWLEDGMENT_TEXT } from "@/lib/rentalAgreement";

interface CustomFee {
  id: number;
  name: string;
  description?: string | null;
  type: "flat" | "percent";
  amount: number;
}

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
  customFees?: CustomFee[];
  onClose: () => void;
}

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  message: string;
}

type IdUploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; url: string; fileName: string }
  | { status: "error"; message: string };

export default function CheckoutModal(props: CheckoutModalProps) {
  const {
    propertyId,
    propertyName,
    checkIn,
    checkOut,
    nights,
    avgNightlyRate,
    guestCount,
    cleaningFee,
    subtotal,
    taxAmount,
    taxRate,
    totalAmount,
    customFees = [],
    onClose,
  } = props;

  const createCheckoutSession = trpc.booking.createCheckoutSession.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [initError, setInitError] = useState<string | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementTouched, setAgreementTouched] = useState(false);
  const [idUpload, setIdUpload] = useState<IdUploadState>({ status: "idle" });
  const [idTouched, setIdTouched] = useState(false);

  // Compute custom fee totals for display
  const customFeeLines = customFees.map((f) => ({
    ...f,
    computed: f.type === "flat" ? f.amount : (subtotal * f.amount) / 100,
  }));
  const customFeesTotal = customFeeLines.reduce((s, f) => s + f.computed, 0);
  const grandTotal = totalAmount + customFeesTotal;
  const taxPct = Math.round(taxRate * 100);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setIdUpload({ status: "error", message: "Please upload a JPEG, PNG, WEBP, HEIC, or PDF file." });
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setIdUpload({ status: "error", message: "File is too large. Maximum size is 10 MB." });
      return;
    }

    setIdUpload({ status: "uploading" });
    try {
      const formData = new FormData();
      formData.append("idFile", file);
      const res = await fetch("/api/upload/guest-id", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = await res.json();
      setIdUpload({ status: "done", url, fileName: file.name });
      setIdTouched(true);
    } catch (err: any) {
      setIdUpload({ status: "error", message: err.message ?? "Upload failed. Please try again." });
    }
    // Reset file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInfo.name.trim() || !guestInfo.email.trim()) return;

    // Hard stop — must upload ID
    if (idUpload.status !== "done") {
      setIdTouched(true);
      return;
    }

    // Hard stop — must accept agreement
    if (!agreementAccepted) {
      setAgreementTouched(true);
      return;
    }

    setInitError(null);
    try {
      const result = await createCheckoutSession.mutateAsync({
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
        guestIdUrl: idUpload.status === "done" ? idUpload.url : undefined,
        agreementAcceptedAt: Date.now(),
      });

      if (!result.checkoutUrl) {
        throw new Error("No checkout URL returned from server.");
      }

      toast.info("Redirecting to secure checkout…");
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setInitError("Unable to start checkout. Please try again.");
      console.error("[CheckoutModal] Checkout session error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Complete Your Booking
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
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

          {/* Itemized fee breakdown */}
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                ${avgNightlyRate.toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span>
                ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cleaning fee</span>
              <span>
                ${cleaningFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Hotel occupancy tax ({taxPct}%)</span>
              <span>
                ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {customFeeLines.map((f) => (
              <div key={f.id} className="flex justify-between text-muted-foreground">
                <span title={f.description ?? undefined}>
                  {f.name}
                  {f.type === "percent" ? ` (${f.amount}%)` : ""}
                </span>
                <span>
                  ${f.computed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border mt-1">
              <span>Total (USD)</span>
              <span>
                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6">
          {initError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {initError}
            </div>
          )}

          <form onSubmit={handleInfoSubmit} className="space-y-5">
            {/* ── STEP 1: Guest Info ── */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                Your Information
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                  <Input
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo((g) => ({ ...g, name: e.target.value }))}
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
                    onChange={(e) => setGuestInfo((g) => ({ ...g, email: e.target.value }))}
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
                    onChange={(e) => setGuestInfo((g) => ({ ...g, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Special Requests (optional)
                  </label>
                  <Textarea
                    value={guestInfo.message}
                    onChange={(e) => setGuestInfo((g) => ({ ...g, message: e.target.value }))}
                    placeholder="Early check-in, late check-out, etc."
                    rows={2}
                    className="bg-background resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ── STEP 2: Government ID Upload ── */}
            <div
              className={`rounded-xl border-2 p-4 transition-colors ${
                idTouched && idUpload.status !== "done"
                  ? "border-red-400 bg-red-50"
                  : idUpload.status === "done"
                  ? "border-green-400 bg-green-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {idUpload.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <IdCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    idUpload.status === "done" ? "text-green-800" : "text-blue-800"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs inline-flex items-center justify-center font-bold mr-2">2</span>
                  Government-Issued Photo ID
                </span>
              </div>

              <p
                className={`text-xs leading-relaxed mb-3 ${
                  idUpload.status === "done" ? "text-green-700" : "text-blue-700"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                For your security and ours, we require a valid government-issued photo ID (driver's license, passport, or state ID). The name on your ID must match the name on the credit card used for payment. Your ID is stored securely and used solely for verification purposes.
              </p>

              {idUpload.status === "done" ? (
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-800 font-medium truncate flex-1">
                    {idUpload.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIdUpload({ status: "idle" });
                      setIdTouched(false);
                    }}
                    className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2 flex-shrink-0"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="guest-id-upload"
                  />
                  <label
                    htmlFor="guest-id-upload"
                    className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg py-3 px-4 cursor-pointer transition-colors text-sm font-medium ${
                      idUpload.status === "uploading"
                        ? "border-blue-300 bg-blue-100 text-blue-500 cursor-not-allowed"
                        : idTouched && (idUpload.status === "idle" || idUpload.status === "error")
                        ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                    }`}
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {idUpload.status === "uploading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Photo ID
                      </>
                    )}
                  </label>

                  {idUpload.status === "error" && (
                    <p className="mt-2 text-xs text-red-600">{idUpload.message}</p>
                  )}
                  {idTouched && (idUpload.status === "idle" || idUpload.status === "uploading") && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      A government-issued photo ID is required to proceed.
                    </p>
                  )}

                  <p className="mt-2 text-xs text-blue-600 opacity-70" style={{ fontFamily: "var(--font-body)" }}>
                    Accepted: JPEG, PNG, WEBP, HEIC, PDF · Max 10 MB
                  </p>
                </>
              )}
            </div>

            {/* ── DEPOSIT HOLD NOTICE ── */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800" style={{ fontFamily: "var(--font-body)" }}>
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">$500 security deposit hold</span> — A temporary authorization hold of $500 will be placed on your card at checkout. This is <em>not</em> a charge and will <strong>not</strong> appear as a payment. It will be released within 3–5 business days after your checkout date if no damages are reported. The hold name on your statement will match the name on your credit card.
              </div>
            </div>

            {/* ── STEP 3: Agreement Hard Stop ── */}
            <div
              className={`rounded-xl border-2 p-4 transition-colors ${
                agreementTouched && !agreementAccepted
                  ? "border-red-400 bg-red-50"
                  : agreementAccepted
                  ? "border-green-400 bg-green-50"
                  : "border-amber-300 bg-amber-50"
              }`}
            >
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                {agreementAccepted ? (
                  <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    agreementAccepted ? "text-green-800" : "text-amber-800"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs inline-flex items-center justify-center font-bold mr-2">3</span>
                  Rental Agreement & House Rules
                </span>
              </div>

              {/* Agreement notice */}
              <p
                className={`text-xs leading-relaxed mb-3 ${
                  agreementAccepted ? "text-green-700" : "text-amber-700"
                }`}
                style={{ fontFamily: "var(--font-body)" }}
              >
                By booking this property, you are entering into a legally binding short-term rental
                agreement under Texas law. Please review the documents below before proceeding.
              </p>

              {/* Document links */}
              <div className="flex flex-col gap-2 mb-4">
                <a
                  href="/rental-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  Read the Short-Term Rental Agreement (Texas)
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
                <a
                  href="/house-rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  Read the House Rules
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>

              {/* Checkbox */}
              <button
                type="button"
                onClick={() => {
                  setAgreementAccepted((v) => !v);
                  setAgreementTouched(true);
                }}
                className="flex items-start gap-3 w-full text-left group"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {agreementAccepted ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square
                      className={`w-5 h-5 ${
                        agreementTouched && !agreementAccepted
                          ? "text-red-500"
                          : "text-amber-500 group-hover:text-amber-700"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-xs leading-relaxed ${
                    agreementAccepted
                      ? "text-green-800"
                      : agreementTouched && !agreementAccepted
                      ? "text-red-700 font-medium"
                      : "text-amber-800"
                  }`}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {AGREEMENT_ACKNOWLEDGMENT_TEXT}
                </span>
              </button>

              {/* Error hint */}
              {agreementTouched && !agreementAccepted && (
                <p className="mt-2 text-xs text-red-600 font-medium" style={{ fontFamily: "var(--font-body)" }}>
                  You must agree to the rental agreement and house rules to proceed.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={createCheckoutSession.isPending || idUpload.status === "uploading"}
              className={`w-full rounded-xl py-5 text-base transition-all ${
                agreementAccepted && idUpload.status === "done"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              onClick={() => {
                if (idUpload.status !== "done") setIdTouched(true);
                if (!agreementAccepted) setAgreementTouched(true);
              }}
            >
              {createCheckoutSession.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing checkout…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continue to Secure Checkout
                  <ExternalLink className="w-4 h-4" />
                </span>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You will be redirected to Stripe's secure checkout page where you can enter your card
              details and apply any promo codes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
