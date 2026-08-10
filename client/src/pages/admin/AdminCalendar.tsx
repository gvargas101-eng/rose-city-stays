/**
 * AdminCalendar — Master multi-property reservation calendar
 * Shows all 11 properties as rows, days as columns, reservations as color-coded bars.
 * Data pulled live from Hostaway (all channels: Airbnb, VRBO, Direct, Manual, etc.)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Property display names ────────────────────────────────────────────────
const PROPERTY_NAMES: Record<string, string> = {
  "the-briar": "The Briar",
  "hospital-district": "Hospital District",
  "hollytree-golf-dining": "Hollytree Golf",
  "alamo-house": "Alamo House",
  "green-acres": "Green Acres",
  "legacy-house": "Legacy House",
  "azalea-spring-cottage": "Azalea Cottage",
  "noir-hollytree": "Noir Hollytree",
  "hollytree-king-bed": "Hollytree King",
  "hollytree-townhouse": "Hollytree Townhouse",
  "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys": "Cozy 3BR Downtown",
};

const PROPERTY_ORDER = Object.keys(PROPERTY_NAMES);

// ── Channel color map ─────────────────────────────────────────────────────
function channelColor(channelName: string): { bg: string; text: string; border: string } {
  const ch = (channelName || "").toLowerCase();
  if (ch.includes("airbnb")) return { bg: "bg-rose-500", text: "text-white", border: "border-rose-600" };
  if (ch.includes("vrbo") || ch.includes("homeaway")) return { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" };
  if (ch.includes("booking")) return { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-600" };
  if (ch.includes("direct") || ch.includes("2000")) return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" };
  return { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" };
}

// ── Date helpers ──────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// ── Tooltip ───────────────────────────────────────────────────────────────
interface TooltipInfo {
  guestName: string;
  channelName: string;
  arrivalDate: string;
  departureDate: string;
  numberOfGuests: number;
  totalPrice: number;
  x: number;
  y: number;
}

export default function AdminCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth()); // 0-indexed
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const firstDay = startOfMonth(year, month);
  const numDays = daysInMonth(year, month);
  const startDate = toYMD(firstDay);
  // Fetch 2 extra days so reservations starting at month-end are visible
  const endDate = toYMD(addDays(firstDay, numDays + 1));

  const { data, isLoading, refetch, isFetching } = trpc.admin.getReservationsForCalendar.useQuery(
    { startDate, endDate },
    { staleTime: 2 * 60 * 1000 } // 2-minute cache
  );

  // Build a lookup: propertySlug → reservation[]
  const reservationMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!data) return map;
    for (const entry of data) {
      map[entry.propertySlug] = entry.reservations.filter(r => r.status !== "cancelled");
    }
    return map;
  }, [data]);

  // Days array for the header
  const days = Array.from({ length: numDays }, (_, i) => {
    const d = addDays(firstDay, i);
    return { date: toYMD(d), dayNum: i + 1, dayOfWeek: d.getUTCDay() };
  });

  const todayStr = toYMD(today);
  const monthName = firstDay.toLocaleString("en-US", { month: "long", timeZone: "UTC" });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // For each property row, compute which days are covered by each reservation
  function getReservationBars(propertySlug: string) {
    const reservations = reservationMap[propertySlug] ?? [];
    return reservations.map(r => {
      const arrival = r.arrivalDate;   // YYYY-MM-DD
      const departure = r.departureDate; // YYYY-MM-DD (checkout day — not occupied)
      // Find which days in this month are covered
      const startCol = days.findIndex(d => d.date >= arrival && d.date < departure);
      const endCol = days.findLastIndex(d => d.date >= arrival && d.date < departure);
      if (startCol === -1) return null;
      return { ...r, startCol, endCol, span: endCol - startCol + 1 };
    }).filter(Boolean);
  }

  const CELL_W = 32; // px per day cell
  const ROW_LABEL_W = 160; // px for property name column

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Master Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All properties · All channels · Live from Hostaway
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-medium min-w-[140px] text-center">
            {monthName} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-2 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Channel legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "Airbnb", bg: "bg-rose-500" },
          { label: "VRBO / HomeAway", bg: "bg-blue-500" },
          { label: "Booking.com", bg: "bg-indigo-500" },
          { label: "Direct / Website", bg: "bg-emerald-500" },
          { label: "Other", bg: "bg-amber-500" },
        ].map(c => (
          <span key={c.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`inline-block w-3 h-3 rounded-sm ${c.bg}`} />
            {c.label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading reservations from Hostaway…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div style={{ minWidth: ROW_LABEL_W + numDays * CELL_W }}>
            {/* Day header row */}
            <div className="flex border-b border-border sticky top-0 bg-muted z-10">
              <div style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border shrink-0">
                Property
              </div>
              {days.map(d => (
                <div
                  key={d.date}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`text-center py-2 text-xs border-r border-border last:border-r-0 shrink-0
                    ${d.date === todayStr ? "bg-primary/10 font-bold text-primary" : ""}
                    ${d.dayOfWeek === 0 || d.dayOfWeek === 6 ? "bg-muted/60" : ""}
                  `}
                >
                  <div className="font-medium">{d.dayNum}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {["Su","Mo","Tu","We","Th","Fr","Sa"][d.dayOfWeek]}
                  </div>
                </div>
              ))}
            </div>

            {/* Property rows */}
            {PROPERTY_ORDER.map((slug, rowIdx) => {
              const bars = getReservationBars(slug);
              return (
                <div
                  key={slug}
                  className={`flex relative border-b border-border last:border-b-0 ${rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  style={{ height: 44 }}
                >
                  {/* Property name */}
                  <div
                    style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                    className="px-3 flex items-center border-r border-border shrink-0 z-10 bg-inherit"
                  >
                    <span className="text-xs font-medium text-foreground truncate">
                      {PROPERTY_NAMES[slug] ?? slug}
                    </span>
                  </div>

                  {/* Day cells (background grid) */}
                  <div className="flex absolute left-[160px] top-0 bottom-0">
                    {days.map(d => (
                      <div
                        key={d.date}
                        style={{ width: CELL_W, minWidth: CELL_W }}
                        className={`border-r border-border/40 last:border-r-0 h-full shrink-0
                          ${d.date === todayStr ? "bg-primary/5" : ""}
                          ${d.dayOfWeek === 0 || d.dayOfWeek === 6 ? "bg-muted/30" : ""}
                        `}
                      />
                    ))}
                  </div>

                  {/* Reservation bars */}
                  {bars.map((bar: any, bi: number) => {
                    const colors = channelColor(bar.channelName);
                    const left = bar.startCol * CELL_W;
                    const width = bar.span * CELL_W - 2;
                    return (
                      <div
                        key={`${bar.id}-${bi}`}
                        className={`absolute top-2 bottom-2 rounded cursor-pointer border ${colors.bg} ${colors.border} ${colors.text} flex items-center px-1.5 overflow-hidden z-20`}
                        style={{ left: left + ROW_LABEL_W, width }}
                        onMouseEnter={e => setTooltip({
                          guestName: bar.guestName,
                          channelName: bar.channelName,
                          arrivalDate: bar.arrivalDate,
                          departureDate: bar.departureDate,
                          numberOfGuests: bar.numberOfGuests,
                          totalPrice: bar.totalPrice,
                          x: (e.currentTarget as HTMLElement).getBoundingClientRect().left,
                          y: (e.currentTarget as HTMLElement).getBoundingClientRect().bottom + window.scrollY,
                        })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-[10px] font-medium truncate whitespace-nowrap">
                          {bar.guestName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-xs pointer-events-none"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 220), top: tooltip.y + 8 }}
        >
          <div className="font-semibold text-sm mb-1">{tooltip.guestName}</div>
          <div className="space-y-0.5 text-muted-foreground">
            <div><span className="font-medium text-foreground">Channel:</span> {tooltip.channelName}</div>
            <div><span className="font-medium text-foreground">Check-in:</span> {tooltip.arrivalDate}</div>
            <div><span className="font-medium text-foreground">Check-out:</span> {tooltip.departureDate}</div>
            <div><span className="font-medium text-foreground">Guests:</span> {tooltip.numberOfGuests}</div>
            {tooltip.totalPrice > 0 && (
              <div><span className="font-medium text-foreground">Total:</span> ${tooltip.totalPrice.toFixed(2)}</div>
            )}
          </div>
        </div>
      )}

      {/* Summary counts */}
      {data && (
        <div className="flex flex-wrap gap-3 pt-1">
          {PROPERTY_ORDER.map(slug => {
            const count = (reservationMap[slug] ?? []).length;
            if (count === 0) return null;
            return (
              <Badge key={slug} variant="secondary" className="text-xs">
                {PROPERTY_NAMES[slug] ?? slug}: {count} reservation{count !== 1 ? "s" : ""}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
