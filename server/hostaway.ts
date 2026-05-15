/**
 * Hostaway API integration helper
 * Handles authentication and calendar/availability fetching
 */

import { getAccessToken } from "./hostaway-auth";

const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";

// Map our property IDs to Hostaway listing IDs
export const PROPERTY_TO_HOSTAWAY_ID: Record<string, number> = {
  "the-briar": 329641,
  "hospital-district": 329642,
  "hollytree-golf-dining": 329643,
  "alamo-house": 329644,
  "green-acres": 329645,
  "legacy-house": 329646,
  "azalea-spring-cottage": 329647,
  "noir-hollytree": 329648,
  "hollytree-king-bed": 329649,
  "hollytree-townhouse": 366803,
};

export interface CalendarDay {
  date: string;
  isAvailable: boolean;
  status: string; // "available" | "reserved" | "blocked"
  price: number;
  minimumStay: number;
}

export async function getPropertyCalendar(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<CalendarDay[]> {
  const hostawayId = PROPERTY_TO_HOSTAWAY_ID[propertyId];
  if (!hostawayId) {
    throw new Error(`No Hostaway listing found for property: ${propertyId}`);
  }

  const token = await getAccessToken();

  const res = await fetch(
    `${HOSTAWAY_API_BASE}/listings/${hostawayId}/calendar?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-control": "no-cache",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Hostaway calendar fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return (data.result || []).map((day: any) => ({
    date: day.date,
    isAvailable: day.isAvailable === 1,
    status: day.status || (day.isAvailable === 1 ? "available" : "reserved"),
    price: day.price || 0,
    minimumStay: day.minimumStay || 1,
  }));
}

export async function getListingBasePrice(propertyId: string): Promise<number | null> {
  const hostawayId = PROPERTY_TO_HOSTAWAY_ID[propertyId];
  if (!hostawayId) return null;

  const token = await getAccessToken();

  // Get next 30 days of calendar to find the average available price
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const res = await fetch(
      `${HOSTAWAY_API_BASE}/listings/${hostawayId}/calendar?startDate=${today}&endDate=${future}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-control": "no-cache",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const availableDays = (data.result || []).filter(
      (d: any) => d.isAvailable === 1 && d.price > 0
    );

    if (availableDays.length === 0) {
      // If no available days, return the minimum price from all days
      const allPrices = (data.result || [])
        .map((d: any) => d.price)
        .filter((p: number) => p > 0);
      return allPrices.length > 0 ? Math.min(...allPrices) : null;
    }

    // Return the minimum available price
    return Math.min(...availableDays.map((d: any) => d.price));
  } catch {
    return null;
  }
}
