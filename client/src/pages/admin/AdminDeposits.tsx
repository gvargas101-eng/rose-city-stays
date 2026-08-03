/**
 * AdminDeposits — Damage Deposit Management Dashboard
 *
 * Lists all confirmed bookings that have a Stripe security deposit hold.
 * Admin can:
 *  - Filter by deposit status (all / authorized / captured / released / failed / none)
 *  - Release a hold (cancels the Stripe PaymentIntent — no charge to guest)
 *  - Capture a hold (charges the guest the full deposit amount)
 *  - View Stripe PaymentIntent ID for manual lookup
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  DollarSign,
  User,
  Calendar,
  Home,
} from "lucide-react";
import AdminLayout from "./AdminLayout";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short", day: "numeric", year: "numeric",
  });
}

type DepositStatus = "authorized" | "captured" | "released" | "failed" | "pending" | "none";

function statusConfig(status: DepositStatus | null | undefined): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "authorized":
      return {
        label: "Hold Active",
        className: "bg-blue-100 text-blue-800",
        icon: <Shield className="w-3 h-3" />,
      };
    case "captured":
      return {
        label: "Charged",
        className: "bg-red-100 text-red-800",
        icon: <DollarSign className="w-3 h-3" />,
      };
    case "released":
      return {
        label: "Released",
        className: "bg-green-100 text-green-800",
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-orange-100 text-orange-800",
        icon: <AlertTriangle className="w-3 h-3" />,
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="w-3 h-3" />,
      };
    default:
      return {
        label: "No Hold",
        className: "bg-gray-100 text-gray-500",
        icon: <XCircle className="w-3 h-3" />,
      };
  }
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Bookings" },
  { value: "authorized", label: "Hold Active" },
  { value: "captured", label: "Charged" },
  { value: "released", label: "Released" },
  { value: "failed", label: "Failed" },
  { value: "none", label: "No Hold" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminDeposits() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    bookingId: number;
    action: "release" | "capture";
    guestName: string;
    amount: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: bookings, isLoading } = trpc.admin.listBookings.useQuery();

  const releaseMutation = trpc.admin.releaseDepositHold.useMutation({
    onSuccess: () => {
      utils.admin.listBookings.invalidate();
      toast.success("Deposit hold released — no charge to guest.");
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to release deposit hold");
      setConfirmAction(null);
    },
  });

  const captureMutation = trpc.admin.captureDepositHold.useMutation({
    onSuccess: () => {
      utils.admin.listBookings.invalidate();
      toast.success("Deposit captured — guest has been charged.");
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to capture deposit");
      setConfirmAction(null);
    },
  });

  // Filter bookings to only confirmed/paid ones, then apply status filter
  const filteredBookings = (bookings ?? []).filter((b) => {
    if (b.status !== "confirmed" && b.status !== "paid") return false;
    if (filter === "all") return true;
    if (filter === "none") return !b.depositHoldIntentId;
    return b.depositHoldStatus === filter;
  });

  // Summary counts
  const confirmed = (bookings ?? []).filter(b => b.status === "confirmed" || b.status === "paid");
  const counts = {
    authorized: confirmed.filter(b => b.depositHoldStatus === "authorized").length,
    captured: confirmed.filter(b => b.depositHoldStatus === "captured").length,
    released: confirmed.filter(b => b.depositHoldStatus === "released").length,
    failed: confirmed.filter(b => b.depositHoldStatus === "failed").length,
    none: confirmed.filter(b => !b.depositHoldIntentId).length,
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Deposit Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Manage Stripe security deposit holds for all confirmed bookings. Release holds after a clean checkout or capture them to charge the guest for damages.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Active Holds", count: counts.authorized, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            { label: "Charged", count: counts.captured, color: "text-red-700", bg: "bg-red-50 border-red-200" },
            { label: "Released", count: counts.released, color: "text-green-700", bg: "bg-green-50 border-green-200" },
            { label: "Failed", count: counts.failed, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
            { label: "No Hold", count: counts.none, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
              <div className={`text-2xl font-semibold ${color}`}>{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter ── */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
              {opt.value !== "all" && (
                <span className="ml-1.5 opacity-70">
                  ({opt.value === "none" ? counts.none : counts[opt.value as keyof typeof counts] ?? 0})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Confirm Dialog ── */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                {confirmAction.action === "capture" ? (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {confirmAction.action === "capture" ? "Charge Deposit" : "Release Deposit"}
                  </div>
                  <div className="text-xs text-muted-foreground">{confirmAction.guestName}</div>
                </div>
              </div>

              {confirmAction.action === "capture" ? (
                <p className="text-sm text-foreground">
                  This will <strong>charge {confirmAction.guestName} {confirmAction.amount}</strong> for the security deposit. This action cannot be undone.
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  This will <strong>release the {confirmAction.amount} hold</strong> on {confirmAction.guestName}'s card. No charge will be made. This action cannot be undone.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmAction(null)}
                  disabled={releaseMutation.isPending || captureMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={`flex-1 gap-1.5 ${confirmAction.action === "capture" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                  onClick={() => {
                    if (confirmAction.action === "release") {
                      releaseMutation.mutate({ bookingId: confirmAction.bookingId });
                    } else {
                      captureMutation.mutate({ bookingId: confirmAction.bookingId });
                    }
                  }}
                  disabled={releaseMutation.isPending || captureMutation.isPending}
                >
                  {(releaseMutation.isPending || captureMutation.isPending) && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {confirmAction.action === "capture" ? "Charge Guest" : "Release Hold"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bookings List ── */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {filter === "all"
              ? "No confirmed bookings yet."
              : `No bookings with status "${FILTER_OPTIONS.find(o => o.value === filter)?.label}".`}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const isExpanded = expandedId === booking.id;
              const depositStatus = booking.depositHoldIntentId
                ? (booking.depositHoldStatus as DepositStatus) ?? "pending"
                : "none" as DepositStatus;
              const { label, className, icon } = statusConfig(depositStatus);
              const depositAmount = fmt(booking.depositHoldIntentId ? 500 : null);
              const canRelease = depositStatus === "authorized" || depositStatus === "pending";
              const canCapture = depositStatus === "authorized" || depositStatus === "pending";

              return (
                <div key={booking.id} className="bg-background border border-border rounded-xl overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{booking.guestName}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
                        >
                          {icon}
                          {label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {booking.propertyId}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Total: {fmt(booking.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick action buttons visible without expanding */}
                      {canRelease && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50 text-xs h-7 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              bookingId: booking.id,
                              action: "release",
                              guestName: booking.guestName,
                              amount: depositAmount,
                            });
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Release
                        </Button>
                      )}
                      {canCapture && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              bookingId: booking.id,
                              action: "capture",
                              guestName: booking.guestName,
                              amount: depositAmount,
                            });
                          }}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Charge
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Guest Email</div>
                          <a href={`mailto:${booking.guestEmail}`} className="text-primary hover:underline text-sm">
                            {booking.guestEmail}
                          </a>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Booking #</div>
                          <div className="font-medium">#{booking.id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Nights</div>
                          <div className="font-medium">{booking.nights}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Guests</div>
                          <div className="font-medium">{booking.guestCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Booking Total</div>
                          <div className="font-medium">{fmt(booking.totalAmount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Deposit Status</div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
                            {icon} {label}
                          </span>
                        </div>
                        {booking.depositHoldIntentId && (
                          <div className="sm:col-span-2">
                            <div className="text-xs text-muted-foreground">Stripe Deposit Intent</div>
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-mono text-foreground">
                                {booking.depositHoldIntentId}
                              </code>
                              <a
                                href={`https://dashboard.stripe.com/payment_intents/${booking.depositHoldIntentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                                title="View in Stripe"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        )}
                        {booking.stripePaymentIntentId && (
                          <div className="sm:col-span-2">
                            <div className="text-xs text-muted-foreground">Stripe Booking Payment</div>
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-mono text-foreground">
                                {booking.stripePaymentIntentId}
                              </code>
                              <a
                                href={`https://dashboard.stripe.com/payment_intents/${booking.stripePaymentIntentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                                title="View in Stripe"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Deposit action buttons in expanded view */}
                      {(canRelease || canCapture) && (
                        <div className="flex gap-2 pt-1 border-t border-border">
                          {canRelease && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() =>
                                setConfirmAction({
                                  bookingId: booking.id,
                                  action: "release",
                                  guestName: booking.guestName,
                                  amount: depositAmount,
                                })
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Release Hold
                            </Button>
                          )}
                          {canCapture && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() =>
                                setConfirmAction({
                                  bookingId: booking.id,
                                  action: "capture",
                                  guestName: booking.guestName,
                                  amount: depositAmount,
                                })
                              }
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Charge Deposit
                            </Button>
                          )}
                        </div>
                      )}

                      {depositStatus === "none" && (
                        <p className="text-xs text-muted-foreground italic">
                          No deposit hold was placed for this booking. This may occur for manual bookings with deposit waived, or if the post-checkout hold failed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
