import type { CalendarDay } from "./calendar-types";
import type { StaySelection } from "./staySelection";

export interface CheckoutCustomFee {
  id: number;
  name: string;
  type: "flat" | "percent";
  amount: number;
}

export interface StayEstimate {
  nightlySubtotal: number;
  cleaningFee: number;
  taxAmount: number;
  customFeesTotal: number;
  extraGuestFee: number;
  total: number;
  guestCount: number;
  extraGuestCount: number;
}

const roundCurrency = (amount: number) => Math.round(amount * 100) / 100;

/**
 * Uses the same pricing order as checkout: nightly subtotal, cleaning fee,
 * occupancy tax on nightly charges, guest overage, and active custom fees.
 * Deposit holds, optional add-ons, and discounts are intentionally excluded.
 */
export function calculateStayEstimate({
  selection,
  cleaningFee,
  taxRate,
  customFees = [],
  guestCount = 2,
  includedGuestCount = 4,
  extraGuestFeePerNight = 10,
}: {
  selection: StaySelection;
  cleaningFee: number;
  taxRate: number;
  customFees?: CheckoutCustomFee[];
  guestCount?: number;
  includedGuestCount?: number;
  extraGuestFeePerNight?: number;
}): StayEstimate {
  const nightlySubtotal = roundCurrency(selection.avgNightlyRate * selection.nights);
  const taxAmount = roundCurrency(nightlySubtotal * taxRate);
  const customFeesTotal = roundCurrency(customFees.reduce((total, fee) => {
    const feeAmount = fee.type === "flat"
      ? fee.amount
      : (nightlySubtotal * fee.amount) / 100;
    return total + feeAmount;
  }, 0));
  const extraGuestCount = Math.max(0, guestCount - includedGuestCount);
  const extraGuestFee = roundCurrency(extraGuestCount * extraGuestFeePerNight * selection.nights);
  const total = roundCurrency(nightlySubtotal + cleaningFee + taxAmount + customFeesTotal + extraGuestFee);

  return {
    nightlySubtotal,
    cleaningFee,
    taxAmount,
    customFeesTotal,
    extraGuestFee,
    total,
    guestCount,
    extraGuestCount,
  };
}

/** Returns the lowest positive nightly rate among currently visible, bookable nights. */
export function getBestValueNightlyRate(calendarDays: CalendarDay[]): number | null {
  const rates = calendarDays
    .filter((day) => day.isAvailable && day.price > 0)
    .map((day) => day.price);

  return rates.length > 0 ? Math.min(...rates) : null;
}
