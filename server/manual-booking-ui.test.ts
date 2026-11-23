import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { links, mutation } = vi.hoisted(() => ({ links: [] as any[], mutation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({ admin: { listManualBookingLinks: { invalidate: vi.fn() } } }),
  admin: {
    listProperties: { useQuery: () => ({ data: [] }) },
    listManualBookingLinks: { useQuery: () => ({ data: links, isLoading: false }) },
    searchGuestProfiles: { useQuery: () => ({ data: [], isFetching: false }) },
    createManualBookingLink: { useMutation: mutation },
    revokeManualBookingLink: { useMutation: mutation },
  },
  hostaway: { calendar: { useQuery: () => ({ data: undefined, isFetching: false }) } },
  discountCodes: { validate: { useMutation: mutation } },
} }));
vi.mock("../client/src/pages/admin/AdminLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
import AdminManualBookings from "../client/src/pages/admin/AdminManualBookings";

afterEach(() => { links.length = 0; vi.unstubAllGlobals(); });
const render = () => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { location: { origin: "https://preview.example.com" } });
  return renderToStaticMarkup(React.createElement(AdminManualBookings));
};

describe("manual booking owner UI", () => {
  it("renders separate add-credit controls, percent discounts, and tax override", () => {
    const html = render();
    expect(html).toContain("Create a Manual Booking");
    expect(html).toContain("Add Credit");
    expect(html).toContain("Add Charge");
    expect(html).toContain("Percent (%)");
    expect(html).toContain("Custom Tax Amount");
    expect(html).toContain("confirmed only after payment succeeds");
  });
  it("renders a canceled reservation alongside its paid payment link", () => {
    links.push({ id: 1, token: "sample-token", propertyName: "Sample house", status: "paid", bookingStatus: "cancelled", expiresAt: Date.now() + 86400000,
      checkIn: Date.parse("2027-01-10"), checkOut: Date.parse("2027-01-13"), guestCount: 2, totalAmount: "545.50" });
    const html = render();
    expect(html).toContain("Paid");
    expect(html).toContain("Booking: ");
    expect(html).toContain("Canceled");
  });
});
