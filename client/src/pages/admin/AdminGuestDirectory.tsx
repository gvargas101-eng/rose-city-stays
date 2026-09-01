/** Private admin guest directory populated from Hostaway reservation data. */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, CloudDownload, Loader2, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import AdminLayout from "./AdminLayout";

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function titleFromSlug(value: string | null) {
  if (!value) return "—";
  return value.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function AdminGuestDirectory() {
  const [query, setQuery] = useState("");
  const utils = trpc.useUtils();
  const { data: syncStatus, isLoading: statusLoading } = trpc.admin.getGuestSyncStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: guests, isFetching: searching } = trpc.admin.searchGuestProfiles.useQuery(
    { query: query.trim() },
    { enabled: query.trim().length >= 2, staleTime: 30_000 }
  );
  const syncMutation = trpc.admin.syncHostawayGuests.useMutation({
    onSuccess: (result) => {
      utils.admin.getGuestSyncStatus.invalidate();
      utils.admin.searchGuestProfiles.invalidate();
      toast.success(`Guest sync complete: ${result.processed} reservation${result.processed === 1 ? "" : "s"} processed`);
    },
    onError: (error) => toast.error(error.message || "Guest sync failed"),
  });

  const hasImported = !!syncStatus?.lastHistoricalImportAt;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <Users className="w-6 h-6 text-primary" /> Guest Directory
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search returning guests and use their saved details when creating a manual booking link.
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate({ mode: hasImported ? "reconcile" : "historical" })}
            disabled={syncMutation.isPending}
            className="gap-2 shrink-0"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
            {hasImported ? "Sync Now" : "Import Hostaway Guests"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync Status</div>
            <div className="mt-1 text-lg font-semibold text-foreground capitalize">
              {statusLoading ? "Loading…" : syncStatus?.lastStatus ?? "Not imported"}
            </div>
            {syncStatus?.lastError && <p className="mt-1 text-xs text-destructive line-clamp-2">{syncStatus.lastError}</p>}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Full Import</div>
            <div className="mt-1 text-sm font-medium text-foreground">{fmtDate(syncStatus?.lastHistoricalImportAt)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{syncStatus?.lastImportedReservations ?? 0} reservations in the latest run</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacy</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Contact data only</div>
            <p className="mt-1 text-xs text-muted-foreground">No payment cards or ID files are stored here.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <label className="block text-sm font-semibold text-foreground mb-2">Find a Returning Guest</label>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by name, email, or phone…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Start with at least two characters. Select a result in Manual Bookings to auto-fill the guest’s contact details.</p>
          </div>

          <div className="divide-y divide-border">
            {query.trim().length < 2 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                <UserRound className="w-7 h-7 mx-auto mb-2 opacity-50" />
                Search the imported guest directory.
              </div>
            ) : searching ? (
              <div className="py-14 text-center text-sm text-muted-foreground"><Loader2 className="w-5 h-5 inline mr-2 animate-spin" />Searching…</div>
            ) : guests && guests.length > 0 ? guests.map(guest => (
              <div key={guest.id} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] gap-2 sm:gap-4 items-center">
                <div>
                  <div className="font-medium text-foreground">{guest.fullName}</div>
                  <div className="text-xs text-muted-foreground">{guest.email || "No email"}</div>
                </div>
                <div className="text-sm text-muted-foreground">{guest.phone || "No phone number"}</div>
                <div className="text-xs text-muted-foreground">
                  <div>{titleFromSlug(guest.lastPropertySlug)}</div>
                  <div className="mt-0.5">{guest.lastChannel || "Hostaway"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{guest.totalReservations}</div>
                  <div className="text-[11px] text-muted-foreground">stay{guest.totalReservations === 1 ? "" : "s"}</div>
                </div>
              </div>
            )) : (
              <div className="py-14 text-center text-sm text-muted-foreground">No matching guests found.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground flex gap-2">
          <CalendarDays className="w-4 h-4 shrink-0 text-primary" />
          A scheduled reconciliation will keep this directory current in addition to Hostaway reservation notifications once the webhook is connected.
        </div>
      </div>
    </AdminLayout>
  );
}
