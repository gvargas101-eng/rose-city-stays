import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, User, DollarSign, IdCard, ShieldCheck, ExternalLink, Link2, Mail, MessageSquare, Phone } from "lucide-react";
import { Copy, Check } from "lucide-react";
import { Search } from "lucide-react";
import { properties } from "@/lib/properties";

const STATUS_OPTIONS = ["pending", "paid", "confirmed", "cancelled", "failed"] as const;
type BookingStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

const LINK_STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  used:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  expired:  "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  revoked:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/** Display a UTC-midnight ms timestamp without local timezone shift */
function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Display a creation/event timestamp in local time (intentional) */
function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function AdminBookings() {
  const { data: bookings, refetch: refetchBookings } = trpc.admin.listBookings.useQuery();
  const { data: manualLinks, refetch: refetchLinks } = trpc.admin.listManualBookingLinks.useQuery();

  const updateStatus = trpc.admin.updateBookingStatus.useMutation({
    onSuccess: () => { refetchBookings(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });
  const releaseDeposit = trpc.admin.releaseDepositHold.useMutation({
    onSuccess: () => { refetchBookings(); toast.success("Deposit hold released."); },
    onError: (e) => toast.error(e.message),
  });
  const captureDeposit = trpc.admin.captureDepositHold.useMutation({
    onSuccess: () => { refetchBookings(); toast.success("Deposit captured — guest's card charged."); },
    onError: (e) => toast.error(e.message),
  });
  const revokeLink = trpc.admin.revokeManualBookingLink.useMutation({
    onSuccess: () => { refetchLinks(); toast.success("Link revoked."); },
    onError: (e) => toast.error(e.message),
  });

  const [tab, setTab] = useState<"direct" | "manual">("direct");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedLink, setExpandedLink] = useState<number | null>(null);

  const filtered = (bookings ?? []).filter(
    (b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (b.checkIn < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86400000; // inclusive
        if (b.checkIn >= to) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.guestName.toLowerCase().includes(q) ||
          b.guestEmail.toLowerCase().includes(q) ||
          (b.guestPhone ?? "").toLowerCase().includes(q) ||
          b.propertyId.toLowerCase().includes(q) ||
          (properties.find(p => p.id === b.propertyId)?.name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    }
  );

  const totalRevenue = (bookings ?? [])
    .filter((b) => b.status === "paid" || b.status === "confirmed")
    .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/booking/pay/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
  };

  const sendEmail = (link: { guestEmail?: string | null; guestName?: string | null; propertyName: string; checkIn: number; checkOut: number; token: string }) => {
    const url = `${window.location.origin}/booking/pay/${link.token}`;
    const subject = encodeURIComponent(`Your booking link — ${link.propertyName}`);
    const body = encodeURIComponent(
      `Hi${link.guestName ? ` ${link.guestName}` : ""},\n\nHere is your direct booking link for ${link.propertyName} (${formatDate(link.checkIn)} – ${formatDate(link.checkOut)}):\n\n${url}\n\nPlease complete your reservation at your earliest convenience.\n\nThank you,\nRose City Stays`
    );
    window.open(`mailto:${link.guestEmail ?? ""}?subject=${subject}&body=${body}`, "_blank");
  };

  const sendSMS = (link: { guestName?: string | null; propertyName: string; checkIn: number; checkOut: number; token: string }) => {
    const url = `${window.location.origin}/booking/pay/${link.token}`;
    const body = encodeURIComponent(
      `Hi${link.guestName ? ` ${link.guestName}` : ""}! Here is your booking link for ${link.propertyName} (${formatDate(link.checkIn)} – ${formatDate(link.checkOut)}): ${url}`
    );
    window.open(`sms:?body=${body}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Bookings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {bookings?.length ?? 0} direct bookings · ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })} confirmed revenue
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-muted/40 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("direct")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "direct" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Direct Bookings
            <span className="ml-1.5 text-xs opacity-60">({bookings?.length ?? 0})</span>
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Manual Booking Links
            <span className="ml-1.5 text-xs opacity-60">({manualLinks?.length ?? 0})</span>
          </button>
        </div>

        {/* ── DIRECT BOOKINGS TAB ── */}
        {tab === "direct" && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {/* Search input */}
              <div className="w-full mb-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by guest name, phone, email, or property…"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {/* Date range filter */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Check-in:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
                  >
                    Clear
                  </button>
                )}
              </div>
              {["all", ...STATUS_OPTIONS].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterStatus === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({(bookings ?? []).filter((b) => b.status === s).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-background rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground">No bookings found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <div key={b.id} className="bg-background rounded-xl border border-border overflow-hidden">
                    <button
                      className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-foreground text-sm">{b.guestName}</p>
                            <p className="text-xs text-muted-foreground">{b.guestEmail}</p>
                            {b.guestPhone && (
                              <span className="inline-flex items-center gap-2">
                                <a href={`tel:${b.guestPhone}`}
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                                  onClick={e => e.stopPropagation()}>
                                  <Phone className="w-3 h-3" />{b.guestPhone}
                                </a>
                                <a
                                  href={`sms:${b.guestPhone}?body=${encodeURIComponent(`Hi ${b.guestName}! This is Rose City Stays regarding your stay at ${properties.find(p => p.id === b.propertyId)?.name ?? b.propertyId} (${new Date(b.checkIn).toLocaleDateString()} – ${new Date(b.checkOut).toLocaleDateString()}).`)}`}
                                  className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                  onClick={e => e.stopPropagation()}
                                  title="Send SMS">
                                  <MessageSquare className="w-3 h-3" />SMS
                                </a>
                                <button
                                  onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(b.guestPhone!); }}
                                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                                  title="Copy phone number">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(b.checkIn)} → {formatDate(b.checkOut)} ({b.nights}n)
                        </div>
                        <div className="text-sm text-muted-foreground">{b.propertyId}</div>
                        <div className="flex items-center gap-1 text-sm font-medium text-foreground ml-auto">
                          <DollarSign className="w-3.5 h-3.5" />
                          {parseFloat(b.totalAmount).toFixed(2)}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status as BookingStatus]}`}>
                          {b.status}
                        </span>
                      </div>
                    </button>

                    {expanded === b.id && (
                      <div className="border-t border-border px-5 py-4 bg-muted/10">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                            <p className="text-foreground">{b.guestPhone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Guests</p>
                            <p className="text-foreground">{b.guestCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Nightly Rate</p>
                            <p className="text-foreground">${parseFloat(b.nightlyRate).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Cleaning Fee</p>
                            <p className="text-foreground">${parseFloat(b.cleaningFee).toFixed(2)}</p>
                          </div>
                          {/* ── Itemized Charge Breakdown ── */}
                          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Charge Breakdown</p>
                            <div className="bg-background border border-border rounded-lg overflow-hidden text-sm w-full max-w-sm">
                              <div className="divide-y divide-border">
                                <div className="flex justify-between px-3 py-2">
                                  <span className="text-muted-foreground">${parseFloat(b.nightlyRate).toFixed(2)} × {b.nights} night{b.nights !== 1 ? "s" : ""}</span>
                                  <span className="text-foreground font-medium">${parseFloat(b.subtotal).toFixed(2)}</span>
                                </div>
                                {parseFloat(b.cleaningFee) > 0 && (
                                  <div className="flex justify-between px-3 py-2">
                                    <span className="text-muted-foreground">Cleaning fee</span>
                                    <span className="text-foreground">${parseFloat(b.cleaningFee).toFixed(2)}</span>
                                  </div>
                                )}
                                {parseFloat(b.taxAmount) > 0 && (
                                  <div className="flex justify-between px-3 py-2">
                                    <span className="text-muted-foreground">Tax ({(parseFloat(b.taxRate) * 100).toFixed(1)}%)</span>
                                    <span className="text-foreground">${parseFloat(b.taxAmount).toFixed(2)}</span>
                                  </div>
                                )}
                                {/* Add-ons: derive from total - subtotal - cleaningFee - tax */}
                               {(() => {
                                 const addonsTotal = parseFloat(b.totalAmount) - parseFloat(b.subtotal) - parseFloat(b.cleaningFee) - parseFloat(b.taxAmount);
                                  if (addonsTotal <= 0.01) return null;
                                  // Try to parse named add-ons from snapshot
                                  let addonLines: { name: string; price: number }[] = [];
                                  try {
                                    if (b.addonsSnapshot) addonLines = JSON.parse(b.addonsSnapshot);
                                  } catch { /* ignore */ }
                                  if (addonLines.length > 0) {
                                    return (
                                      <>
                                        {addonLines.map((a, i) => (
                                          <div key={i} className="flex justify-between px-3 py-2">
                                            <span className="text-muted-foreground">{a.name}</span>
                                            <span className="text-foreground">${Number(a.price).toFixed(2)}</span>
                                          </div>
                                        ))}
                                      </>
                                    );
                                  }
                                  // Fallback: no snapshot (older booking) — show generic total
                                  return (
                                    <div className="flex justify-between px-3 py-2">
                                      <span className="text-muted-foreground">Add-ons</span>
                                      <span className="text-foreground">${addonsTotal.toFixed(2)}</span>
                                    </div>
                                  );
                                })()}
                                <div className="flex justify-between px-3 py-2.5 bg-muted/30">
                                  <span className="font-semibold text-foreground">Total charged</span>
                                  <span className="font-semibold text-foreground">${parseFloat(b.totalAmount).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Stripe Payment ID</p>
                            {b.stripePaymentIntentId ? (
                              <a
                                href={`https://dashboard.stripe.com/payments/${b.stripePaymentIntentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-mono"
                              >
                                {b.stripePaymentIntentId.slice(0, 20)}…
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <p className="text-foreground font-mono text-xs">—</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Hostaway Reservation</p>
                            <p className="text-foreground font-mono text-xs">{b.hostawayReservationId || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Booked On</p>
                            <p className="text-foreground">{new Date(b.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                              <IdCard className="w-3 h-3" /> Guest ID
                            </p>
                            {b.guestIdUrl ? (
                              <div className="space-y-2">
                                <a href={b.guestIdUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2">
                                  View ID <ExternalLink className="w-3 h-3" />
                                </a>
                                {/\.(jpe?g|png|webp|heic)$/i.test(b.guestIdUrl) && (
                                  <img src={b.guestIdUrl} alt="Guest ID" className="max-h-48 rounded border border-border object-contain" />
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">Not uploaded</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Agreement Signed
                            </p>
                            {b.agreementAcceptedAt ? (
                              <p className="text-foreground text-xs">{formatDateTime(b.agreementAcceptedAt)}</p>
                            ) : (
                              <p className="text-muted-foreground text-xs">Not recorded</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-500" /> Deposit Hold
                            </p>
                            {b.depositHoldIntentId ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <a href={`https://dashboard.stripe.com/payments/${b.depositHoldIntentId}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2">
                                    View in Stripe <ExternalLink className="w-3 h-3" />
                                  </a>
                                  {b.depositHoldStatus && (
                                    <span className={`text-xs font-medium capitalize px-1.5 py-0.5 rounded-full ${
                                      b.depositHoldStatus === "authorized" ? "bg-green-100 text-green-700" :
                                      b.depositHoldStatus === "captured" ? "bg-red-100 text-red-700" :
                                      b.depositHoldStatus === "released" ? "bg-muted text-muted-foreground" :
                                      b.depositHoldStatus === "failed" ? "bg-red-100 text-red-500" :
                                      "bg-amber-100 text-amber-700"
                                    }`}>{b.depositHoldStatus}</span>
                                  )}
                                </div>
                                {(b.depositHoldStatus === "authorized" || b.depositHoldStatus === "pending") && (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => { if (confirm(`Release the deposit hold for ${b.guestName}?`)) releaseDeposit.mutate({ bookingId: b.id }); }}
                                      disabled={releaseDeposit.isPending || captureDeposit.isPending}
                                      className="text-xs px-2 py-1 rounded border border-muted-foreground/30 text-muted-foreground hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
                                      Release Hold
                                    </button>
                                    <button
                                      onClick={() => { if (confirm(`Capture (charge) the deposit from ${b.guestName}? This will immediately charge their card.`)) captureDeposit.mutate({ bookingId: b.id }); }}
                                      disabled={releaseDeposit.isPending || captureDeposit.isPending}
                                      className="text-xs px-2 py-1 rounded border border-muted-foreground/30 text-muted-foreground hover:border-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50">
                                      Capture Deposit
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">Not created</p>
                            )}
                          </div>
                          {b.message && (
                            <div className="col-span-2 lg:col-span-4">
                              <p className="text-xs text-muted-foreground mb-0.5">Special Requests</p>
                              <p className="text-foreground">{b.message}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Update status:</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUS_OPTIONS.map((s) => (
                              <button key={s}
                                onClick={() => updateStatus.mutate({ id: b.id, status: s })}
                                disabled={b.status === s || updateStatus.isPending}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  b.status === s
                                    ? "border-primary bg-primary/10 text-primary font-medium"
                                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                                }`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MANUAL BOOKING LINKS TAB ── */}
        {tab === "manual" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                All manually created booking links. Click a row to see full details.
              </p>
              <a href="/admin/manual-bookings"
                className="text-xs text-primary hover:text-primary/80 underline underline-offset-2">
                + Create new link
              </a>
            </div>

            {(manualLinks ?? []).length === 0 ? (
              <div className="bg-background rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground mb-3">No manual booking links yet.</p>
                <a href="/admin/manual-bookings"
                  className="text-sm text-primary hover:text-primary/80 underline underline-offset-2">
                  Create your first manual booking link →
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {(manualLinks ?? []).map((link) => (
                  <div key={link.id} className="bg-background rounded-xl border border-border overflow-hidden">
                    <button
                      className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedLink(expandedLink === link.id ? null : link.id)}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {link.guestName || <span className="text-muted-foreground italic">No name</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{link.guestEmail || "No email"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(link.checkIn)} → {formatDate(link.checkOut)}
                          {link.nights ? ` (${link.nights}n)` : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">{link.propertyName}</div>
                        <div className="flex items-center gap-1 text-sm font-medium text-foreground ml-auto">
                          <DollarSign className="w-3.5 h-3.5" />
                          {link.totalAmount ? parseFloat(link.totalAmount).toFixed(2) : "—"}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LINK_STATUS_COLORS[link.status] ?? "bg-muted text-muted-foreground"}`}>
                          {link.status}
                        </span>
                      </div>
                    </button>

                    {expandedLink === link.id && (
                      <div className="border-t border-border px-5 py-4 bg-muted/10">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Guests</p>
                            <p className="text-foreground">{link.guestCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Rate / Night</p>
                            <p className="text-foreground">${link.nightlyRate ? parseFloat(link.nightlyRate).toFixed(2) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Discount</p>
                            <p className="text-foreground">{link.discountAmount ? `-$${parseFloat(link.discountAmount).toFixed(2)}` : "None"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                            <p className="text-foreground">{link.createdAt ? new Date(link.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Expires</p>
                            <p className="text-foreground">{link.expiresAt ? formatDateTime(link.expiresAt) : "Never"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Hostaway Reservation</p>
                            <p className="text-foreground font-mono text-xs">{link.hostawayReservationId || "—"}</p>
                          </div>
                          {link.bookingId && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Booking ID</p>
                              <p className="text-foreground font-mono text-xs">#{link.bookingId}</p>
                            </div>
                          )}
                          {link.guestNote && (
                            <div className="col-span-2 lg:col-span-4">
                              <p className="text-xs text-muted-foreground mb-0.5">Guest Note</p>
                              <p className="text-foreground text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">{link.guestNote}</p>
                            </div>
                          )}
                          <div className="col-span-2 lg:col-span-4">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><IdCard className="w-3 h-3" /> Guest ID</p>
                            {link.guestIdUrl ? (
                              <div className="space-y-2">
                                <a href={link.guestIdUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2">
                                  View ID <ExternalLink className="w-3 h-3" />
                                </a>
                                {/\.(jpe?g|png|webp|heic)$/i.test(link.guestIdUrl) && (
                                  <img src={link.guestIdUrl} alt="Guest ID" className="max-h-48 rounded border border-border object-contain" />
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">{link.status === 'paid' ? 'Not uploaded' : 'Pending payment'}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => copyLink(link.token)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">
                            <Link2 className="w-3.5 h-3.5" /> Copy Link
                          </button>
                          <button
                            onClick={() => sendEmail(link)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">
                            <Mail className="w-3.5 h-3.5" /> Send Email
                          </button>
                          <button
                            onClick={() => sendSMS(link)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" /> Send SMS
                          </button>
                          {link.status === "active" && (
                            <button
                              onClick={() => { if (confirm("Revoke this link? The guest will no longer be able to use it.")) revokeLink.mutate({ id: link.id }); }}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto">
                              Revoke Link
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
