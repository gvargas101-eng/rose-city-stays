import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { validateStaySelection, type StaySelection } from "@/lib/staySelection";
import { getBestValueNightlyRate, type StayEstimate } from "@/lib/stayEstimate";

interface AvailabilityCalendarProps {
  propertyId: string;
  minStay?: number;
  minStayMap?: Record<string, number>;
  selectedStay?: StaySelection | null;
  estimate?: StayEstimate | null;
  clearSelectionSignal?: number;
  onRangeChange?: (range: StaySelection | null, checkInDateStr?: string) => void;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({
  propertyId,
  minStay = 1,
  minStayMap = {},
  selectedStay,
  estimate,
  clearSelectionSignal = 0,
  onRangeChange,
}: AvailabilityCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [checkInDate, setCheckInDate] = useState<string | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState("Click an available date to choose check-in.");

  const startDate = useMemo(() => formatDate(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const endDate = useMemo(() => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return formatDate(nextYear, nextMonth, new Date(nextYear, nextMonth + 1, 0).getDate());
  }, [viewYear, viewMonth]);

  const { data, isLoading, error } = trpc.hostaway.calendar.useQuery(
    { propertyId, startDate, endDate },
    { staleTime: 5 * 60 * 1000 }
  );

  const availabilityMap = useMemo(() => {
    const map: Record<string, { isAvailable: boolean; price: number; minimumStay: number }> = {};
    data?.days.forEach((day) => {
      map[day.date] = {
        isAvailable: day.isAvailable,
        price: day.price,
        minimumStay: day.minimumStay,
      };
    });
    return map;
  }, [data]);

  const bestValueRate = useMemo(
    () => getBestValueNightlyRate(data?.days ?? []),
    [data?.days]
  );

  useEffect(() => {
    if (!selectedStay) return;
    setCheckInDate(selectedStay.checkIn.toISOString().slice(0, 10));
    setCheckOutDate(selectedStay.checkOut.toISOString().slice(0, 10));
  }, [selectedStay]);

  useEffect(() => {
    if (clearSelectionSignal === 0) return;
    setCheckInDate(null);
    setCheckOutDate(null);
    setSelectionMessage("Dates cleared. Click an available date to choose check-in.");
  }, [clearSelectionSignal]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const handleDateClick = (date: string) => {
    const day = availabilityMap[date];
    if (!day?.isAvailable) return;

    if (!checkInDate || checkOutDate || date <= checkInDate) {
      setCheckInDate(date);
      setCheckOutDate(null);
      setSelectionMessage(`Check-in: ${date}. Now choose your check-out date.`);
      onRangeChange?.(null, date);
      return;
    }

    const validation = validateStaySelection({
      checkInDate,
      checkOutDate: date,
      calendarDays: data?.days ?? [],
      minStay,
      minStayMap,
    });

    if (!validation.valid) {
      if (validation.reason === "minimum-stay") {
        const nightsRequired = minStayMap[checkInDate] ?? minStay;
        setSelectionMessage(`${nightsRequired}-night minimum for this check-in. Please choose a later check-out date.`);
      } else {
        setSelectionMessage("Those dates include an unavailable night. Please choose another check-out date.");
      }
      onRangeChange?.(null, checkInDate);
      return;
    }

    setCheckOutDate(date);
    setSelectionMessage(`${validation.selection.nights}-night stay selected. Your booking details are ready.`);
    onRangeChange?.(validation.selection, checkInDate);
  };

  const clearDateSelection = () => {
    setCheckInDate(null);
    setCheckOutDate(null);
    setSelectionMessage("Dates cleared. Click an available date to choose check-in.");
    onRangeChange?.(null);
  };

  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(<div key={`empty-${year}-${month}-${i}`} aria-hidden="true" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = formatDate(year, month, day);
      const isPast = date < todayStr;
      const info = availabilityMap[date];
      const isAvailable = !isPast && info?.isAvailable;
      const isUnavailable = !isPast && info && !info.isAvailable;
      const isCheckIn = checkInDate === date;
      const isCheckOut = checkOutDate === date;
      const isWithinRange = Boolean(checkInDate && checkOutDate && date > checkInDate && date < checkOutDate);
      const rangeSelected = isCheckIn || isCheckOut || isWithinRange;
      const isBestValue = isAvailable && bestValueRate !== null && info.price === bestValueRate;
      const label = isPast
        ? `${date}, unavailable because it is in the past`
        : isAvailable
          ? `${date}, $${info.price} per night, ${info.minimumStay}-night minimum. ${isCheckIn ? "Selected check-in." : isCheckOut ? "Selected check-out." : "Select date."}`
          : `${date}, not available`;

      cells.push(
        <button
          key={date}
          type="button"
          onClick={() => handleDateClick(date)}
          disabled={!isAvailable}
          aria-label={label}
          aria-pressed={rangeSelected}
          title={isAvailable ? `$${info.price}/night · ${info.minimumStay} night min · Click to select` : isUnavailable ? "Not available" : ""}
          className={`
            relative flex flex-col items-center justify-center rounded-md text-xs h-12 w-full border transition-colors
            ${isPast ? "text-muted-foreground/30 cursor-default border-transparent" : ""}
            ${isAvailable && !rangeSelected ? "bg-emerald-50 text-emerald-800 cursor-pointer border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" : ""}
            ${isAvailable && (isCheckIn || isCheckOut) ? "bg-primary text-primary-foreground cursor-pointer border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" : ""}
            ${isAvailable && isWithinRange ? "bg-primary/15 text-foreground cursor-pointer border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" : ""}
            ${isUnavailable ? "bg-red-50 text-red-400 cursor-not-allowed border-red-100" : ""}
            ${!isPast && !info ? "text-muted-foreground border-transparent cursor-not-allowed" : ""}
            ${isBestValue && !rangeSelected ? "ring-1 ring-amber-400 ring-offset-1" : ""}
          `}
        >
          {isBestValue && !rangeSelected && (
            <span className="absolute top-0.5 right-0.5 rounded-full bg-amber-300 px-1 text-[7px] font-bold uppercase leading-3 text-amber-950">
              Best
            </span>
          )}
          <span className={`font-semibold leading-tight ${isAvailable && !isWithinRange ? "text-inherit" : ""} ${isUnavailable ? "line-through text-red-300" : ""}`}>
            {day}
          </span>
          {isAvailable && info.price > 0 && (
            <span className={`text-[9px] leading-tight font-medium mt-0.5 ${isCheckIn || isCheckOut ? "text-primary-foreground/90" : "text-emerald-700"}`}>
              ${info.price}
            </span>
          )}
          {isUnavailable && <span className="text-[9px] leading-tight text-red-300 mt-0.5">Booked</span>}
        </button>
      );
    }

    return cells;
  };

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="text-lg font-medium text-foreground" style={{ fontFamily: "var(--font-display)" }}>Choose your dates</h3>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
            Click an available check-in date, then your check-out date.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(checkInDate || checkOutDate) && (
            <button
              type="button"
              onClick={clearDateSelection}
              className="mr-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Clear dates
            </button>
          )}
          <button onClick={goToPrevMonth} disabled={!canGoPrev} aria-label="Previous month" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToNextMonth} aria-label="Next month" className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-5" style={{ fontFamily: "var(--font-body)" }}>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" />Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-300 border border-amber-400 inline-block" />Best value</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />Booked</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Loading availability...</span></div>
      ) : error ? (
        <div className="text-center py-8 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>Unable to load availability. Please contact us directly.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[[viewYear, viewMonth], [nextYear, nextMonth]].map(([year, month]) => (
              <div key={`${year}-${month}`}>
                <div className="text-center text-sm font-medium text-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>{MONTHS[month]} {year}</div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS_OF_WEEK.map((weekday) => <div key={weekday} className="text-center text-xs text-muted-foreground font-medium py-1" style={{ fontFamily: "var(--font-body)" }}>{weekday}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">{renderMonth(year, month)}</div>
              </div>
            ))}
          </div>
          <p aria-live="polite" className="text-xs text-center mt-4 text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{selectionMessage}</p>
          {estimate && checkInDate && checkOutDate && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>Estimated checkout total</p>
                  <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                    Includes your stay, cleaning, occupancy tax, and required fees.
                  </p>
                </div>
                <span className="text-xl font-semibold text-primary" style={{ fontFamily: "var(--font-display)" }}>
                  ${estimate.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                <div className="flex justify-between gap-4"><span>Nightly stay</span><span>${estimate.nightlySubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between gap-4"><span>Cleaning fee</span><span>${estimate.cleaningFee.toFixed(2)}</span></div>
                <div className="flex justify-between gap-4"><span>Occupancy tax</span><span>${estimate.taxAmount.toFixed(2)}</span></div>
                {estimate.customFeesTotal > 0 && <div className="flex justify-between gap-4"><span>Required fees</span><span>${estimate.customFeesTotal.toFixed(2)}</span></div>}
                {estimate.extraGuestFee > 0 && <div className="flex justify-between gap-4"><span>Extra guests</span><span>${estimate.extraGuestFee.toFixed(2)}</span></div>}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
                Based on {estimate.guestCount} guest{estimate.guestCount === 1 ? "" : "s"}. Optional add-ons, promotional discounts, and the refundable security deposit hold are shown separately at checkout.
              </p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground mt-2 text-center" style={{ fontFamily: "var(--font-body)" }}>Nightly rates shown on available dates. Synced with Hostaway in real time.</p>
    </div>
  );
}
