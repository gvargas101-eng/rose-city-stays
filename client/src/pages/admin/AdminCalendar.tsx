/**
 * AdminCalendar — Master multi-property reservation calendar.
 * Shows all properties as rows and extends the timeline by three months as the
 * owner scrolls right. Reservation data is pulled live from Hostaway.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getUtcTimelineDays } from "@/lib/calendarDates";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
const CELL_W = 32;
const ROW_LABEL_W = 160;
const INITIAL_VISIBLE_MONTHS = 3;
const MONTHS_TO_LOAD = 3;

function channelColor(channelName: string): { bg: string; text: string; border: string } {
  const channel = (channelName || "").toLowerCase();
  if (channel.includes("airbnb")) return { bg: "bg-rose-500", text: "text-white", border: "border-rose-600" };
  if (channel.includes("vrbo") || channel.includes("homeaway")) return { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" };
  if (channel.includes("booking")) return { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-600" };
  if (channel.includes("direct") || channel.includes("2000")) return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" };
  return { bg: "bg-amber-500", text: "text-white", border: "border-amber-600" };
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function abbreviatedMonth(dateString: string): string {
  return new Date(`${dateString}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

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
  const [timelineStart, setTimelineStart] = useState(() =>
    startOfMonth(today.getUTCFullYear(), today.getUTCMonth())
  );
  const [visibleMonths, setVisibleMonths] = useState(INITIAL_VISIBLE_MONTHS);
  const [isExtending, setIsExtending] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);

  const year = timelineStart.getUTCFullYear();
  const month = timelineStart.getUTCMonth();
  const days = useMemo(
    () => getUtcTimelineDays(year, month, visibleMonths),
    [year, month, visibleMonths]
  );
  const numDays = days.length;
  const startDate = days[0]?.date ?? toYMD(timelineStart);
  // Include one buffer day so reservations arriving at the right boundary are returned.
  const endDate = toYMD(addDays(timelineStart, numDays + 1));

  const { data, isLoading, refetch, isFetching } = trpc.admin.getReservationsForCalendar.useQuery(
    { startDate, endDate },
    { staleTime: 2 * 60 * 1000 }
  );

  const reservationMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const entry of data ?? []) {
      map[entry.propertySlug] = entry.reservations.filter((reservation: any) => reservation.status !== "cancelled");
    }
    return map;
  }, [data]);

  const todayStr = toYMD(today);
  const timelineEndMonth = new Date(Date.UTC(year, month + visibleMonths - 1, 1));

  useEffect(() => {
    timelineScrollRef.current?.scrollTo({ left: 0 });
  }, [timelineStart]);

  function resetTimeline(nextStart: Date) {
    setTimelineStart(nextStart);
    setVisibleMonths(INITIAL_VISIBLE_MONTHS);
  }

  function prevMonth() {
    resetTimeline(startOfMonth(year, month - 1));
  }

  function nextMonth() {
    resetTimeline(startOfMonth(year, month + 1));
  }

  function goToToday() {
    resetTimeline(startOfMonth(today.getUTCFullYear(), today.getUTCMonth()));
  }

  function handleTimelineScroll() {
    const scroller = timelineScrollRef.current;
    if (!scroller || loadMoreLockRef.current) return;
    const isNearTimelineEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - CELL_W * 10;
    if (!isNearTimelineEnd) return;

    loadMoreLockRef.current = true;
    setIsExtending(true);
    setVisibleMonths((current) => current + MONTHS_TO_LOAD);
    window.setTimeout(() => {
      loadMoreLockRef.current = false;
      setIsExtending(false);
    }, 350);
  }

  function getReservationBars(propertySlug: string) {
    const reservations = reservationMap[propertySlug] ?? [];
    return reservations
      .map((reservation) => {
        const startCol = days.findIndex((day) => day.date >= reservation.arrivalDate && day.date < reservation.departureDate);
        const endCol = days.findLastIndex((day) => day.date >= reservation.arrivalDate && day.date < reservation.departureDate);
        if (startCol === -1 || endCol === -1) return null;
        return { ...reservation, startCol, endCol, span: endCol - startCol + 1 };
      })
      .filter(Boolean);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Master Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All properties · All channels · Live from Hostaway · Scroll right to load future months
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm md:text-base font-medium min-w-[230px] text-center">
            {monthLabel(timelineStart)} – {monthLabel(timelineEndMonth)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "Airbnb", bg: "bg-rose-500" },
          { label: "VRBO / HomeAway", bg: "bg-blue-500" },
          { label: "Booking.com", bg: "bg-indigo-500" },
          { label: "Direct / Website", bg: "bg-emerald-500" },
          { label: "Other", bg: "bg-amber-500" },
        ].map((channel) => (
          <span key={channel.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`inline-block w-3 h-3 rounded-sm ${channel.bg}`} />
            {channel.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading reservations from Hostaway…
        </div>
      ) : (
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          className="overflow-x-auto rounded-lg border border-border bg-card"
        >
          <div style={{ minWidth: ROW_LABEL_W + numDays * CELL_W }}>
            <div className="flex border-b border-border sticky top-0 bg-muted z-10">
              <div
                style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border shrink-0"
              >
                Property
              </div>
              {days.map((day) => (
                <div
                  key={day.date}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`text-center py-1.5 text-xs border-r border-border last:border-r-0 shrink-0
                    ${day.date === todayStr ? "bg-primary/10 font-bold text-primary" : ""}
                    ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? "bg-muted/60" : ""}`}
                  title={day.date}
                >
                  <div className="font-medium">{day.dayNum}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {day.dayNum === 1 ? abbreviatedMonth(day.date) : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][day.dayOfWeek]}
                  </div>
                </div>
              ))}
            </div>

            {PROPERTY_ORDER.map((slug, rowIndex) => {
              const bars = getReservationBars(slug);
              return (
                <div
                  key={slug}
                  className={`flex relative border-b border-border last:border-b-0 ${rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  style={{ height: 44 }}
                >
                  <div
                    style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                    className="px-3 flex items-center border-r border-border shrink-0 z-10 bg-inherit"
                  >
                    <span className="text-xs font-medium text-foreground truncate">{PROPERTY_NAMES[slug] ?? slug}</span>
                  </div>

                  <div className="flex absolute left-[160px] top-0 bottom-0">
                    {days.map((day) => (
                      <div
                        key={day.date}
                        style={{ width: CELL_W, minWidth: CELL_W }}
                        className={`border-r border-border/40 last:border-r-0 h-full shrink-0
                          ${day.date === todayStr ? "bg-primary/5" : ""}
                          ${day.dayOfWeek === 0 || day.dayOfWeek === 6 ? "bg-muted/30" : ""}`}
                      />
                    ))}
                  </div>

                  {bars.map((bar: any, index: number) => {
                    const colors = channelColor(bar.channelName);
                    const left = bar.startCol * CELL_W;
                    const width = bar.span * CELL_W - 2;
                    return (
                      <div
                        key={`${bar.id}-${index}`}
                        className={`absolute top-2 bottom-2 rounded cursor-pointer border ${colors.bg} ${colors.border} ${colors.text} flex items-center px-1.5 overflow-hidden z-20`}
                        style={{ left: left + ROW_LABEL_W, width }}
                        onMouseEnter={(event) => setTooltip({
                          guestName: bar.guestName,
                          channelName: bar.channelName,
                          arrivalDate: bar.arrivalDate,
                          departureDate: bar.departureDate,
                          numberOfGuests: bar.numberOfGuests,
                          totalPrice: bar.totalPrice,
                          x: event.currentTarget.getBoundingClientRect().left,
                          y: event.currentTarget.getBoundingClientRect().bottom + window.scrollY,
                        })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-[10px] font-medium truncate whitespace-nowrap">{bar.guestName}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(isExtending || isFetching) && !isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Loading additional months…
        </div>
      )}

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
            {tooltip.totalPrice > 0 && <div><span className="font-medium text-foreground">Total:</span> ${tooltip.totalPrice.toFixed(2)}</div>}
          </div>
        </div>
      )}

      {data && (
        <div className="flex flex-wrap gap-3 pt-1">
          {PROPERTY_ORDER.map((slug) => {
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
