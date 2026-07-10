/**
 * AdminCorporateInquiries — view and manage corporate / extended-stay inquiries.
 */

import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, Calendar, User, Phone, Mail, FileText, Clock } from "lucide-react";

const STATUS_OPTIONS = ["new", "contacted", "booked", "closed"] as const;
type InquiryStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  booked: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

function formatDate(ts: Date | string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(ts: Date | string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminCorporateInquiries() {
  const { data: inquiries, refetch } = trpc.admin.listCorporateInquiries.useQuery();
  const updateStatus = trpc.admin.updateCorporateInquiryStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = (inquiries ?? []).filter(
    (i) => filterStatus === "all" || i.status === filterStatus
  );

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Corporate Inquiries</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {inquiries?.length ?? 0} total · Extended-stay and corporate rental requests
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
                  ({(inquiries ?? []).filter((i) => i.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-background rounded-xl border border-border p-12 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No corporate inquiries found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inq) => (
              <div
                key={inq.id}
                className="bg-background rounded-xl border border-border overflow-hidden"
              >
                {/* Summary row */}
                <button
                  className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                  onClick={() => setExpanded(expanded === inq.id ? null : inq.id)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{inq.name}</p>
                        {inq.company && (
                          <p className="text-xs text-muted-foreground">{inq.company}</p>
                        )}
                      </div>
                    </div>
                    {(inq.checkIn || inq.checkOut) && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {inq.checkIn && inq.checkOut
                          ? `${inq.checkIn} → ${inq.checkOut}`
                          : inq.checkIn ?? inq.checkOut}
                        {inq.durationMonths && (
                          <span className="ml-1 text-xs">({inq.durationMonths} mo)</span>
                        )}
                      </div>
                    )}
                    {inq.propertyPreference && (
                      <div className="text-sm text-muted-foreground truncate max-w-[160px]">
                        {inq.propertyPreference}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(inq.createdAt)}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        STATUS_COLORS[inq.status as InquiryStatus] ?? STATUS_COLORS.new
                      }`}
                    >
                      {inq.status}
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {expanded === inq.id && (
                  <div className="border-t border-border px-5 py-4 bg-muted/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email
                        </p>
                        <a
                          href={`mailto:${inq.email}`}
                          className="text-primary hover:underline text-xs"
                        >
                          {inq.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
                        </p>
                        <p className="text-foreground text-xs">
                          {inq.phone ? (
                            <a href={`tel:${inq.phone}`} className="text-primary hover:underline">
                              {inq.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Guests</p>
                        <p className="text-foreground text-xs">{inq.guestCount ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                        <p className="text-foreground text-xs">
                          {inq.durationMonths ? `${inq.durationMonths} month(s)` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Check-in</p>
                        <p className="text-foreground text-xs">{inq.checkIn ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Check-out</p>
                        <p className="text-foreground text-xs">{inq.checkOut ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Property Preference</p>
                        <p className="text-foreground text-xs">{inq.propertyPreference ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Submitted</p>
                        <p className="text-foreground text-xs">{formatDateTime(inq.createdAt)}</p>
                      </div>
                      {inq.notes && (
                        <div className="col-span-2 lg:col-span-4">
                          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Notes
                          </p>
                          <p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                            {inq.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status update */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">Update status:</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              updateStatus.mutate({ id: inq.id, status: s })
                            }
                            disabled={inq.status === s || updateStatus.isPending}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              inq.status === s
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
