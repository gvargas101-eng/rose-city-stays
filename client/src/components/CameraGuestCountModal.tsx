/**
 * CameraGuestCountModal — Hard-stop acknowledgment modal
 *
 * Triggered when a guest clicks "Book Now" on a property detail page.
 * The guest must check THREE boxes before they can proceed to checkout:
 *   1. Outdoor security camera disclosure
 *   2. Guest count accuracy + overage fee acknowledgment
 *   3. Acceptance of Terms & Conditions, Rental Agreement, and House Rules
 *
 * All three checkboxes must be checked before "Continue to Booking" is enabled.
 */

import { useState } from "react";
import { Camera, Users, AlertTriangle, ShieldCheck, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface CameraGuestCountModalProps {
  guestCount: number;
  maxIncludedGuests?: number;   // guests included in base rate (default 4)
  overageFeePerNight?: number;  // extra charge per guest per night above threshold (default 10)
  nights?: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CameraGuestCountModal({
  guestCount,
  maxIncludedGuests = 4,
  overageFeePerNight = 10,
  nights = 0,
  onConfirm,
  onClose,
}: CameraGuestCountModalProps) {
  const [cameraAcknowledged, setCameraAcknowledged] = useState(false);
  const [guestCountConfirmed, setGuestCountConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const extraGuests = Math.max(0, guestCount - maxIncludedGuests);
  const overageTotal = extraGuests * overageFeePerNight * (nights || 1);
  const canContinue = cameraAcknowledged && guestCountConfirmed && termsAccepted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2
                id="camera-modal-title"
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Before You Book
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                Please read and acknowledge all three items below
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* 1. Camera Disclosure */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              cameraAcknowledged
                ? "border-green-500 bg-green-50"
                : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <input
              type="checkbox"
              checked={cameraAcknowledged}
              onChange={e => setCameraAcknowledged(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-green-600 flex-shrink-0 cursor-pointer"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary flex-shrink-0" />
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Outdoor Security Cameras
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                This property has <strong className="text-foreground">outdoor security cameras</strong> at entry points
                (front door, driveway, and/or backyard entrance). Cameras monitor the exterior only — never inside the
                home. They are used for <strong className="text-foreground">security and guest count verification</strong>.
                Footage may be reviewed in the event of a policy violation.
              </p>
              {cameraAcknowledged && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Acknowledged
                </div>
              )}
            </div>
          </label>

          {/* 2. Guest Count Accuracy */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              guestCountConfirmed
                ? "border-green-500 bg-green-50"
                : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <input
              type="checkbox"
              checked={guestCountConfirmed}
              onChange={e => setGuestCountConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-green-600 flex-shrink-0 cursor-pointer"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Guest Count Accuracy — {guestCount} {guestCount === 1 ? "Guest" : "Guests"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                I confirm that <strong className="text-foreground">{guestCount} {guestCount === 1 ? "guest" : "guests"}</strong> is
                accurate and includes every person who will be on the property. The base rate covers up to{" "}
                <strong className="text-foreground">{maxIncludedGuests} guests</strong>. Additional guests are charged{" "}
                <strong className="text-foreground">${overageFeePerNight}/night per extra guest</strong>.
                {extraGuests > 0 && (
                  <span className="block mt-1.5 text-amber-700 font-medium">
                    Your booking includes {extraGuests} extra {extraGuests === 1 ? "guest" : "guests"} beyond the base
                    rate — an overage fee of{" "}
                    <strong>
                      ${overageFeePerNight}/night × {extraGuests} {extraGuests === 1 ? "guest" : "guests"}
                      {nights > 0 ? ` × ${nights} nights = $${overageTotal.toLocaleString()}` : ""}
                    </strong>{" "}
                    will be added to your total.
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                Outdoor cameras verify occupancy. Undisclosed guests may result in additional charges or cancellation of
                your stay without refund.
              </p>
              {guestCountConfirmed && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Confirmed
                </div>
              )}
            </div>
          </label>

          {/* 3. Terms, Rental Agreement & House Rules */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              termsAccepted
                ? "border-green-500 bg-green-50"
                : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-green-600 flex-shrink-0 cursor-pointer"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Terms, Rental Agreement &amp; House Rules
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                I have read and agree to the Rose City Stays{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={e => e.stopPropagation()}
                >
                  Terms &amp; Conditions
                </a>
                ,{" "}
                <a
                  href="/rental-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={e => e.stopPropagation()}
                >
                  Rental Agreement
                </a>
                , and{" "}
                <a
                  href="/house-rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={e => e.stopPropagation()}
                >
                  House Rules
                </a>
                . I understand that violation of these policies may result in immediate termination of my stay without
                refund and forfeiture of the security deposit.
              </p>
              {termsAccepted && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Accepted
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3 flex-shrink-0 border-t border-border">
          <Button
            onClick={onConfirm}
            disabled={!canContinue}
            className={`w-full py-6 rounded-xl text-base font-medium transition-all ${
              canContinue
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {canContinue
              ? "Continue to Booking →"
              : `Please acknowledge all ${[cameraAcknowledged, guestCountConfirmed, termsAccepted].filter(Boolean).length < 2 ? "three" : "remaining"} items above`}
          </Button>
          <button
            onClick={onClose}
            className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
