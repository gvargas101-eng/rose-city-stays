import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, User, DollarSign, IdCard, ShieldCheck, ExternalLink } from "lucide-react";

const STATUS_OPTIONS = ["pending", "paid", "confirmed", "cancelled", "failed"] as const;
type BookingStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminBookings() {
  const { data: bookings, refetch } = trpc.admin.listBookings.useQuery();
  const updateStatus = trpc.admin.updateBookingStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); },
    onError: (e) => toast.error(e.message),
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = (bookings ?? []).filter(
    (b) => filterStatus === "all" || b.status === filterStatus
  );

  const totalRevenue = (bookings ?? [])
    .filter((b) => b.status === "paid" || b.status === "confirmed")
    .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Bookings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {bookings?.length ?? 0} total bookings · ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })} confirmed revenue
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
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
              <div
                key={b.id}
                className="bg-background rounded-xl border border-border overflow-hidden"
              >
                {/* Summary row */}
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

                {/* Expanded details */}
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
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Stripe Payment ID</p>
                        <p className="text-foreground font-mono text-xs truncate">{b.stripePaymentIntentId || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Hostaway Reservation</p>
                        <p className="text-foreground font-mono text-xs">{b.hostawayReservationId || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Booked On</p>
                        <p className="text-foreground">{new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <IdCard className="w-3 h-3" /> Guest ID
                        </p>
                        {b.guestIdUrl ? (
                          <a
                            href={b.guestIdUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2"
                          >
                            View ID <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-muted-foreground text-xs">Not uploaded</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Agreement Signed
                        </p>
                        {b.agreementAcceptedAt ? (
                          <p className="text-foreground text-xs">
                            {new Date(b.agreementAcceptedAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit"
                            })}
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-xs">Not recorded</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-500" /> Deposit Hold
                        </p>
                        {b.depositHoldIntentId ? (
                          <div className="space-y-0.5">
                            <a
                              href={`https://dashboard.stripe.com/payments/${b.depositHoldIntentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2"
                            >
                              View in Stripe <ExternalLink className="w-3 h-3" />
                            </a>
                            {b.depositHoldStatus && (
                              <p className={`text-xs font-medium capitalize ${
                                b.depositHoldStatus === "authorized" ? "text-green-600" :
                                b.depositHoldStatus === "captured" ? "text-red-600" :
                                b.depositHoldStatus === "released" ? "text-muted-foreground" :
                                b.depositHoldStatus === "failed" ? "text-red-500" :
                                "text-amber-600"
                              }`}>
                                {b.depositHoldStatus}
                              </p>
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

                    {/* Status update */}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Update status:</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus.mutate({ id: b.id, status: s })}
                            disabled={b.status === s || updateStatus.isPending}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              b.status === s
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                            }`}
                          >
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
      </div>
    </AdminLayout>
  );
}
