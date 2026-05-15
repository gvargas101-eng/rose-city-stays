/**
 * BookingPanel — sticky sidebar panel on property detail pages
 * Shows: date range picker, booking summary, and Book Now / Send Inquiry CTAs
 * Replaces the old "Book on Hostaway" button with a native booking flow
 */

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Star, ChevronDown, ChevronUp } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import type { CalendarDay } from "@/lib/calendar-types";

interface BookingPanelProps {
  propertyId: string;
  propertyName: string;
  basePrice: number | null;
  rating: number;
  reviewCount: number;
  calendarDays: CalendarDay[];
  onBookNow: (booking: BookingSelection) => void;
  onInquiry: () => void;
}

export interface BookingSelection {
  checkIn: Date;
  checkOut: Date;
  nights: number;
  avgNightlyRate: number;
  guestCount: number;
}

const CLEANING_FEES: Record<string, number> = {
  "the-briar": 150,
  "hospital-district": 125,
  "hollytree-golf-dining": 150,
  "alamo-house": 175,
  "green-acres": 150,
  "legacy-house": 150,
  "azalea-spring-cottage": 125,
  "noir-hollytree": 125,
  "hollytree-king-bed": 125,
  "hollytree-townhouse": 125,
};

export default function BookingPanel({
  propertyId,
  propertyName,
  basePrice,
  rating,
  reviewCount,
  calendarDays,
  onBookNow,
  onInquiry,
}: BookingPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [selection, setSelection] = useState<{
    checkIn: Date;
    checkOut: Date;
    nights: number;
    avgNightlyRate: number;
  } | null>(null);

  const cleaningFee = CLEANING_FEES[propertyId] ?? 125;
  const nightlyRate = selection?.avgNightlyRate || basePrice || 0;
  const subtotal = nightlyRate * (selection?.nights || 0);
  const total = subtotal + cleaningFee;

  const handleRangeChange = (range: { checkIn: Date; checkOut: Date; nights: number; avgNightlyRate: number } | null) => {
    setSelection(range);
    if (range) setShowPicker(false);
  };

  const handleBookNow = () => {
    if (!selection) {
      setShowPicker(true);
      return;
    }
    onBookNow({ ...selection, guestCount });
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-5">
      {/* Price + rating header */}
      <div className="flex items-start justify-between">
        <div>
          {nightlyRate > 0 ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">${nightlyRate}</span>
              <span className="text-muted-foreground text-sm">/ night</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Loading price…</span>
          )}
        </div>
        {rating > 0 && (
          <div className="flex items-center gap-1 text-sm text-foreground">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-medium">{rating.toFixed(2)}</span>
            {reviewCount > 0 && (
              <span className="text-muted-foreground">({reviewCount} reviews)</span>
            )}
          </div>
        )}
      </div>

      {/* Date selector */}
      <div>
        <button
          onClick={() => setShowPicker(v => !v)}
          className="w-full flex items-center justify-between border border-border rounded-xl px-4 py-3 text-sm hover:border-primary transition-colors bg-background"
        >
          <div className="flex items-center gap-2 text-foreground">
            <CalendarDays className="w-4 h-4 text-primary" />
            {selection ? (
              <span>
                {format(selection.checkIn, "MMM d")} → {format(selection.checkOut, "MMM d, yyyy")}
                <span className="text-muted-foreground ml-2">({selection.nights} nights)</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select dates</span>
            )}
          </div>
          {showPicker ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showPicker && (
          <div className="mt-2 border border-border rounded-xl p-3 bg-background overflow-hidden">
            <DateRangePicker
              calendarDays={calendarDays}
              onRangeChange={handleRangeChange}
            />
          </div>
        )}
      </div>

      {/* Guest count */}
      <div className="flex items-center justify-between border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span>Guests</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGuestCount(g => Math.max(1, g - 1))}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors text-base leading-none"
          >
            −
          </button>
          <span className="text-sm font-medium w-4 text-center text-foreground">{guestCount}</span>
          <button
            onClick={() => setGuestCount(g => Math.min(16, g + 1))}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors text-base leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* Price breakdown (only when dates selected) */}
      {selection && nightlyRate > 0 && (
        <div className="space-y-2 text-sm border-t border-border pt-4">
          <div className="flex justify-between text-foreground">
            <span>${nightlyRate} × {selection.nights} nights</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-foreground">
            <span>Cleaning fee</span>
            <span>${cleaningFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Book Now CTA */}
      <Button
        onClick={handleBookNow}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl py-6 text-base font-medium"
      >
        {selection ? "Book Now — No Platform Fees" : "Check Availability"}
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span>or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Inquiry link */}
      <button
        onClick={onInquiry}
        className="w-full text-sm text-center text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
      >
        Send a direct inquiry — no platform fees
      </button>
    </div>
  );
}
