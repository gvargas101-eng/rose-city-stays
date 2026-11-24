/**
 * AdminCalendar — Master multi-property reservation calendar.
 * Shows all properties as rows and extends the timeline by three months as the
 * owner scrolls right. Reservation data is pulled live from Hostaway.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getUtcTimelineDays } from "@/lib/calendarDates";
import { getCalendarMonthSegments, getCalendarMonthTone } from "@/lib/calendarMonths";
import { buildCalendarBookingUrl, calendarRangeHasConflict, calendarStayNights, isCalendarNightReserved, nextCalendarSelection, validateCalendarStay, type CalendarBookingSelection } from "@/lib/calendarBooking";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isHostawayReservationCancelled } from "@shared/bookingCancellation";

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
  "alamo-crossing-retreat": "Alamo Crossing Retreat",
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
  const [activeMonthKey, setActiveMonthKey] = useState(() => toYMD(timelineStart).slice(0, 7));
  const [selection, setSelection] = useState<CalendarBookingSelection | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);

  const year = timelineStart.getUTCFullYear();
  const month = timelineStart.getUTCMonth();
  const days = useMemo(
    () => getUtcTimelineDays(year, month, visibleMonths),
    [year, month, visibleMonths]
  );
  const monthSegments = useMemo(() => getCalendarMonthSegments(days), [days]);
  const numDays = days.length;
  const startDate = days[0]?.date ?? toYMD(timelineStart);
  // Include one buffer day so reservations arriving at the right boundary are returned.
  const endDate = toYMD(addDays(timelineStart, numDays + 1));

  const { data, isLoading, refetch, isFetching, error: reservationsError } = trpc.admin.getReservationsForCalendar.useQuery(
    { startDate, endDate },
    { staleTime: 2 * 60 * 1000 }
  );

  const reservationMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const entry of data ?? []) {
      map[entry.propertySlug] = entry.reservations.filter((reservation: any) => !isHostawayReservationCancelled(reservation));
    }
    return map;
  }, [data]);

  const loadedProperties = useMemo(() => new Set((data ?? []).map(entry => entry.propertySlug)), [data]);
  const completeSelection = selection?.checkOut
    ? { propertySlug: selection.propertySlug, checkIn: selection.checkIn, checkOut: selection.checkOut }
    : null;
  const { data: liveAvailability, isFetching: availabilityFetching, error: availabilityError, refetch: refreshAvailability } = trpc.hostaway.calendar.useQuery(
    { propertyId: selection?.propertySlug ?? "", startDate: selection?.checkIn ?? startDate, endDate: selection?.checkOut ?? startDate },
    { enabled: !!completeSelection, staleTime: 0, retry: false }
  );
  const availabilityValidation = completeSelection && liveAvailability
    ? validateCalendarStay(completeSelection, liveAvailability.days) : null;
  const knownConflict = completeSelection
    ? calendarRangeHasConflict(completeSelection.checkIn, completeSelection.checkOut, reservationMap[completeSelection.propertySlug] ?? []) : false;
  const canContinue = !!completeSelection && loadedProperties.has(completeSelection.propertySlug)
    && !isFetching && !reservationsError && !availabilityFetching && !availabilityError
    && availabilityValidation?.valid === true && !knownConflict;

  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
  const timelineEndMonth = new Date(Date.UTC(year, month + visibleMonths - 1, 1));

  useEffect(() => {
    timelineScrollRef.current?.scrollTo({ left: 0 });
  }, [timelineStart]);

  function resetTimeline(nextStart: Date) {
    setTimelineStart(nextStart);
    setVisibleMonths(INITIAL_VISIBLE_MONTHS);
    setActiveMonthKey(toYMD(nextStart).slice(0, 7));
    setTooltip(null);
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

  function jumpToMonth(key: string) {
    const segment = monthSegments.find(item => item.key === key);
    if (!segment) return;
    timelineScrollRef.current?.scrollTo({ left: segment.startCol * CELL_W, behavior: "auto" });
    setActiveMonthKey(key);
    setTooltip(null);
  }

  function handleTimelineScroll() {
    const scroller = timelineScrollRef.current;
    if (!scroller) return;
    const visibleDay = days[Math.min(numDays - 1, Math.floor(scroller.scrollLeft / CELL_W))];
    if (visibleDay) setActiveMonthKey(visibleDay.date.slice(0, 7));
    setTooltip(null);
    if (loadMoreLockRef.current) return;
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

  function selectDate(propertySlug: string, date: string) {
    if (isLoading || isFetching || reservationsError || !loadedProperties.has(propertySlug)) {
      setSelectionError("Reservation data is unavailable for this property. Refresh before selecting dates.");
      return;
    }
    if (date < todayStr) {
      setSelectionError("Choose today or a future date for the new reservation.");
      return;
    }
    const result = nextCalendarSelection(selection, propertySlug, date, reservationMap[propertySlug] ?? []);
    setSelection(result.selection);
    setSelectionError(result.error);
    setTooltip(null);
  }

  function continueToBooking() {
    if (!canContinue || !completeSelection) return;
    window.location.assign(buildCalendarBookingUrl(completeSelection));
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

      <nav aria-label="Calendar months" className="space-y-2">
        <p className="text-xs text-muted-foreground">Jump to a month. Soft background colors separate months; reservation colors still identify booking channels.</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {monthSegments.map(segment => (
            <button
              key={segment.key}
              type="button"
              aria-label={`Jump to ${segment.label}`}
              aria-current={activeMonthKey === segment.key ? "true" : undefined}
              data-month-key={segment.key}
              disabled={isLoading}
              onClick={() => jumpToMonth(segment.key)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${getCalendarMonthTone(segment.key).chip} ${activeMonthKey === segment.key ? "ring-2 ring-primary ring-offset-1" : "hover:shadow-sm"}`}
            >
              {segment.shortLabel}
            </button>
          ))}
        </div>
      </nav>

      <section aria-label="Create booking from calendar" className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground">Create a reservation from the calendar</p>
        <p className="text-xs text-muted-foreground">Click or tap a check-in date in the property's row, then its check-out date in the same row. The check-out night is not included. Choosing another property starts a new selection.</p>
        <div aria-live="polite" className="text-sm text-foreground">
          {selection ? <>
            <strong>{PROPERTY_NAMES[selection.propertySlug] ?? selection.propertySlug}</strong>: {selection.checkIn} → {selection.checkOut ?? "Choose check-out"}
            {selection.checkOut && <span> · {calendarStayNights(selection.checkIn, selection.checkOut)} night{calendarStayNights(selection.checkIn, selection.checkOut) === 1 ? "" : "s"}</span>}
          </> : "Select a check-in date to begin."}
        </div>
        {selectionError && <p role="alert" className="text-xs text-destructive">{selectionError}</p>}
        {completeSelection && <div aria-live="polite" className="text-xs">
          {availabilityFetching ? <p className="text-muted-foreground">Checking live Hostaway availability…</p>
            : availabilityError ? <p role="alert" className="text-destructive">Live availability could not be verified. Retry before continuing.</p>
            : knownConflict || availabilityValidation?.valid === false ? <p role="alert" className="text-destructive">{knownConflict ? "These dates now overlap an existing reservation. Choose different dates." : availabilityValidation?.reason}</p>
            : canContinue ? <p className="text-green-700 dark:text-green-300">Dates verified. Review pricing and guest details in Create Booking.</p>
            : <p className="text-muted-foreground">Waiting for verified calendar data…</p>}
        </div>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={!canContinue} onClick={continueToBooking}>Continue to Create Booking</Button>
          {selection && <Button type="button" size="sm" variant="outline" onClick={() => { setSelection(null); setSelectionError(null); }}>Clear selection</Button>}
          {completeSelection && availabilityError && <Button type="button" size="sm" variant="outline" disabled={availabilityFetching} onClick={() => { void refreshAvailability(); }}>Retry availability</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Selecting dates does not create or hold a reservation. Availability is checked again before the final booking is created.</p>
      </section>

      {reservationsError && <p role="alert" className="text-sm text-destructive">Calendar reservations could not be loaded. Refresh or sign in to the admin page before selecting dates.</p>}

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
            <div className="flex border-b border-border" aria-label="Month headings">
              <div style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }} className="sticky left-0 z-30 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">Month</div>
              {monthSegments.map(segment => (
                <div
                  key={segment.key}
                  data-month-band={segment.key}
                  style={{ width: segment.dayCount * CELL_W, minWidth: segment.dayCount * CELL_W }}
                  className={`shrink-0 border-l-2 px-3 py-2 text-sm font-semibold ${getCalendarMonthTone(segment.key).header} ${getCalendarMonthTone(segment.key).boundary}`}
                >
                  {segment.label}
                </div>
              ))}
            </div>
            <div className="flex border-b border-border sticky top-0 bg-muted z-10">
              <div
                style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                className="sticky left-0 z-30 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border shrink-0"
              >
                Property
              </div>
              {days.map((day) => {
                const tone = getCalendarMonthTone(day.date.slice(0, 7));
                const weekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                return (
                <div
                  key={day.date}
                  data-calendar-date={day.date}
                  data-month-key={day.date.slice(0, 7)}
                  aria-current={day.date === todayStr ? "date" : undefined}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className={`text-center py-1.5 text-xs border-r border-border last:border-r-0 shrink-0
                    ${weekend ? tone.weekend : tone.day}
                    ${day.dayNum === 1 ? `border-l-2 ${tone.boundary}` : ""}
                    ${day.date === todayStr ? "font-bold ring-2 ring-inset ring-primary" : ""}`}
                  title={day.date}
                >
                  <div className="font-medium">{day.dayNum}</div>
                  <div className="text-[9px] opacity-75">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][day.dayOfWeek]}
                  </div>
                </div>
              );})}
            </div>

            {PROPERTY_ORDER.map((slug, rowIndex) => {
              const bars = getReservationBars(slug);
              const propertyLoaded = loadedProperties.has(slug) && !reservationsError;
              return (
                <div
                  key={slug}
                  className={`flex relative border-b border-border last:border-b-0 ${rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  style={{ height: 44 }}
                >
                  <div
                    style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W }}
                    className={`sticky left-0 px-3 flex items-center border-r border-border shrink-0 z-30 ${rowIndex % 2 === 0 ? "bg-background" : "bg-card"}`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground truncate">{PROPERTY_NAMES[slug] ?? slug}</span>
                      {!propertyLoaded && <span className="block text-[9px] text-destructive">Calendar unavailable</span>}
                    </div>
                  </div>

                  <div className="flex absolute left-[160px] top-0 bottom-0">
                    {days.map((day) => {
                      const tone = getCalendarMonthTone(day.date.slice(0, 7));
                      const reserved = isCalendarNightReserved(day.date, reservationMap[slug] ?? []);
                      const checkoutCandidate = selection?.propertySlug === slug && !selection.checkOut && day.date > selection.checkIn
                        && !calendarRangeHasConflict(selection.checkIn, day.date, reservationMap[slug] ?? []);
                      const selectedNight = selection?.propertySlug === slug && day.date >= selection.checkIn
                        && day.date < (selection.checkOut ?? toYMD(addDays(new Date(`${selection.checkIn}T00:00:00Z`), 1)));
                      const checkout = selection?.propertySlug === slug && day.date === selection.checkOut;
                      const disabled = !propertyLoaded || isFetching || day.date < todayStr || (reserved && !checkoutCandidate);
                      return (
                      <button
                        key={day.date}
                        type="button"
                        data-select-property={slug}
                        data-select-date={day.date}
                        data-month-boundary={day.dayNum === 1 ? day.date : undefined}
                        aria-label={`${PROPERTY_NAMES[slug] ?? slug}: ${day.date}${checkoutCandidate ? ", choose check-out" : ", choose check-in"}${reserved && !checkoutCandidate ? " (reserved)" : ""}`}
                        aria-pressed={!!selectedNight || !!checkout}
                        disabled={disabled}
                        onClick={() => selectDate(slug, day.date)}
                        style={{ width: CELL_W, minWidth: CELL_W }}
                        className={`relative border-r border-border/40 last:border-r-0 h-full shrink-0 ${tone.grid} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary enabled:hover:ring-2 enabled:hover:ring-inset enabled:hover:ring-primary/50 disabled:cursor-not-allowed
                          ${selectedNight ? "ring-2 ring-inset ring-primary bg-primary/20" : ""}
                          ${checkout ? "ring-2 ring-inset ring-primary" : ""}
                          ${reserved && (checkoutCandidate || checkout) ? "z-30" : ""}
                          ${day.dayNum === 1 ? `border-l-2 ${tone.boundary}` : ""}
                          ${day.date === todayStr ? "ring-1 ring-inset ring-primary/40" : ""}`}
                      >
                        {(selectedNight && day.date === selection?.checkIn) || checkout ? <span className="text-[10px] font-bold text-primary">{checkout ? "OUT" : "IN"}</span> : null}
                        {reserved && checkoutCandidate && <span className="absolute bottom-0 inset-x-0 bg-card text-[8px] font-bold text-primary">OUT</span>}
                      </button>
                    );})}
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
