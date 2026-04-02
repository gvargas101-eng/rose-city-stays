import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AvailabilityCalendarProps {
  propertyId: string;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({ propertyId }: AvailabilityCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Calculate date range for the current view (show 2 months)
  const startDate = useMemo(() => {
    return formatDate(viewYear, viewMonth, 1);
  }, [viewYear, viewMonth]);

  const endDate = useMemo(() => {
    // End of next month
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    return formatDate(nextYear, nextMonth, lastDay);
  }, [viewYear, viewMonth]);

  const { data, isLoading, error } = trpc.hostaway.calendar.useQuery(
    { propertyId, startDate, endDate },
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  );

  // Build a lookup map: date string -> availability info
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

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }

    // Day cells — taller to accommodate price display
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const isPast = dateStr < todayStr;
      const info = availabilityMap[dateStr];
      const isAvailable = !isPast && info?.isAvailable;
      const isUnavailable = !isPast && info && !info.isAvailable;

      cells.push(
        <div
          key={dateStr}
          title={
            isPast
              ? ""
              : isAvailable
              ? `$${info.price}/night · ${info.minimumStay} night min`
              : isUnavailable
              ? "Not available"
              : ""
          }
          className={`
            relative flex flex-col items-center justify-center rounded-md text-xs h-12 w-full
            ${isPast ? "text-muted-foreground/30 cursor-default" : ""}
            ${isAvailable ? "bg-emerald-50 text-emerald-800 cursor-default border border-emerald-200 hover:bg-emerald-100 transition-colors" : ""}
            ${isUnavailable ? "bg-red-50 text-red-400 cursor-default" : ""}
            ${!isPast && !info ? "text-muted-foreground" : ""}
          `}
        >
          <span className={`font-semibold leading-tight ${isAvailable ? "text-emerald-900" : ""} ${isUnavailable ? "line-through text-red-300" : ""}`}>
            {day}
          </span>
          {isAvailable && info.price > 0 && (
            <span className="text-[9px] leading-tight text-emerald-700 font-medium mt-0.5">
              ${info.price}
            </span>
          )}
          {isUnavailable && (
            <span className="text-[9px] leading-tight text-red-300 mt-0.5">
              Booked
            </span>
          )}
        </div>
      );
    }

    return cells;
  };

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  // Don't allow navigating before current month
  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-lg font-medium text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Availability
        </h3>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200 inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />
              Booked
            </span>
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            Loading availability...
          </span>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          Unable to load availability. Please contact us directly.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Month 1 */}
          <div>
            <div
              className="text-center text-sm font-medium text-foreground mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-muted-foreground font-medium py-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderMonth(viewYear, viewMonth)}
            </div>
          </div>

          {/* Month 2 */}
          <div>
            <div
              className="text-center text-sm font-medium text-foreground mb-3"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {MONTHS[nextMonth]} {nextYear}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-muted-foreground font-medium py-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderMonth(nextYear, nextMonth)}
            </div>
          </div>
        </div>
      )}

      <p
        className="text-xs text-muted-foreground mt-4 text-center"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Nightly rates shown on available dates. Synced with Hostaway in real time.
      </p>
    </div>
  );
}
