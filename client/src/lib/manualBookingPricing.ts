export interface PricedCalendarDay {
  date: string;
  price: number;
}

export interface StayPriceSummary {
  nightlyRate: number;
  lodgingTotal: number;
  pricedNights: number;
}

/**
 * Converts Hostaway's date-specific nightly prices into the two-decimal
 * average rate stored by a manual booking link. Check-out is excluded.
 */
export function getStayPriceSummary(
  days: PricedCalendarDay[] | undefined,
  checkIn: string,
  checkOut: string,
): StayPriceSummary | null {
  if (!days || !checkIn || !checkOut || checkIn >= checkOut) return null;

  const stayPrices = days
    .filter((day) => day.date >= checkIn && day.date < checkOut)
    .map((day) => Number(day.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  const checkInMs = Date.parse(`${checkIn}T12:00:00Z`);
  const checkOutMs = Date.parse(`${checkOut}T12:00:00Z`);
  const expectedNights = Math.round((checkOutMs - checkInMs) / 86_400_000);

  if (expectedNights < 1 || stayPrices.length !== expectedNights) return null;

  const lodgingTotal = Math.round(stayPrices.reduce((sum, price) => sum + price, 0) * 100) / 100;
  return {
    nightlyRate: Math.round((lodgingTotal / expectedNights) * 100) / 100,
    lodgingTotal,
    pricedNights: expectedNights,
  };
}
