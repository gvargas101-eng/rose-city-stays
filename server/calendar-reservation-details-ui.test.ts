import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  reservations: [] as any[], details: undefined as any, error: null as any, loading: false, fetching: false,
  query: vi.fn(), retry: vi.fn(), state: new Map<number, any>(), index: 0, tree: null as any,
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: any) => {
    const index = mocks.index++;
    const [value] = actual.useState(mocks.state.has(index) ? mocks.state.get(index) : initial);
    return [value, (next: any) => mocks.state.set(index, typeof next === "function" ? next(value) : next)];
  } };
});
vi.mock("@/lib/trpc", () => ({ trpc: {
  admin: {
    getReservationsForCalendar: { useQuery: () => ({ data: [{ propertySlug: "the-briar", reservations: mocks.reservations }], isLoading: false, isFetching: false }) },
    getCalendarReservationDetails: { useQuery: (...args: any[]) => { mocks.query(...args); return { data: mocks.details, error: mocks.error, isLoading: mocks.loading, isFetching: mocks.fetching, refetch: mocks.retry }; } },
  }, hostaway: { calendar: { useQuery: () => ({ data: undefined, isFetching: false }) } },
} }));
// SSR has no portal DOM. Real focus trapping, Escape, mobile bounds are tested in the isolated browser fixture.
vi.mock("@/components/ui/dialog", () => {
  const element = (tag: string, extra = {}) => ({ children, ...props }: any) => React.createElement(tag, { ...extra, className: props.className }, children);
  return { Dialog: ({ children }: any) => children, DialogContent: element("section", { role: "dialog" }),
    DialogHeader: element("header"), DialogTitle: element("h1"), DialogDescription: element("p") };
});
import AdminCalendar from "../client/src/pages/admin/AdminCalendar";
const stay = (overrides = {}) => ({ id: 101, listingMapId: 329641, guestName: "Synthetic bridge", channelName: "Airbnb",
  arrivalDate: "2026-10-29", departureDate: "2026-12-03", status: "confirmed", numberOfGuests: 4, totalPrice: 1200.5, ...overrides });
function render() {
  mocks.index = 0;
  function Wrapper() { mocks.tree = AdminCalendar(); return mocks.tree; }
  return renderToStaticMarkup(React.createElement(Wrapper));
}
function elements(...args: any[]): any[] {
  const node = args.length ? args[0] : mocks.tree;
  if (Array.isArray(node)) return node.flatMap(child => elements(child));
  if (!React.isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
const bar = () => elements().find(node => node.props["data-reservation-id"] === 101);
function open() { render(); bar().props.onClick({ stopPropagation: vi.fn(), currentTarget: { focus: vi.fn() } }); return render(); }
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { innerWidth: 390, scrollY: 0, setTimeout: vi.fn() });
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-24T12:00:00Z"));
  mocks.state.clear(); mocks.index = 0; mocks.reservations = [stay()]; mocks.details = undefined; mocks.error = null; mocks.loading = false; mocks.fetching = false;
  vi.clearAllMocks();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("calendar reservation details: click and rendering", () => {
  it("lazily loads details only on click with the exact reservation and property", () => {
    render(); expect(mocks.query).not.toHaveBeenCalled();
    const event = { stopPropagation: vi.fn(), currentTarget: { focus: vi.fn() } };
    bar().props.onClick(event); expect(event.stopPropagation).toHaveBeenCalledOnce();
    const html = render();
    expect(mocks.query).toHaveBeenCalledWith({ reservationId: 101, propertySlug: "the-briar" }, expect.objectContaining({ retry: false }));
    expect(html).toContain("Reservation details"); expect(mocks.state.get(5)).toBeUndefined();
  });
  it("uses a native keyboard/touch button with accessible full-date label and preserved channel color", () => {
    render(); const button = bar();
    expect(button.type).toBe("button"); expect(button.props.type).toBe("button");
    expect(button.props["aria-haspopup"]).toBe("dialog"); expect(button.props["aria-label"]).toContain("2026-10-29");
    expect(button.props.className).toContain("focus-visible:ring-2"); expect(button.props.className).toContain("bg-rose-500");
  });
  it("shows full original dates and nights when the left edge is clipped", () => {
    mocks.loading = true;
    const html = open();
    expect(bar().props.style.left).toBe(160);
    expect(html).toContain("October 29, 2026"); expect(html).toContain("December 3, 2026"); expect(html).toContain("35 nights");
    expect(html).toContain("Loading verified contact"); expect(html).toContain("max-h-[90dvh]"); expect(html).toContain("overflow-y-auto"); expect(html).toContain("sm:grid-cols-2");
  });
  it("shows full departure when the right edge is clipped and crosses the year boundary", () => {
    mocks.reservations = [stay({ arrivalDate: "2027-01-30", departureDate: "2027-02-05" })];
    const html = open(); expect(bar().props.style.width).toBe(2 * 32 - 2);
    expect(html).toContain("January 30, 2027"); expect(html).toContain("February 5, 2027"); expect(html).toContain("6 nights");
  });
  it("shows truthful Hostaway-only details without inventing contact or website pricing", () => {
    mocks.details = { reservation: { ...stay(), nights: 35, email: null, phone: null, currency: "USD" }, websiteBooking: null, websiteBookingState: "not_found" };
    const html = open(); expect(html).toContain("No matching website booking"); expect(html).toContain("Not provided");
    expect(html).toContain("not proof of payment"); expect(html).not.toContain("Matching website booking #");
  });
  it("shows only the matching record itemization and owner unpaid payment state", () => {
    mocks.details = { reservation: { ...stay(), nights: 35, email: "synthetic@example.test", phone: "5550100", currency: "USD" },
      websiteBookingState: "matched", websiteBooking: { id: 7, source: "owner", status: "confirmed", currency: "USD",
        items: [{ label: "Accommodation", amount: 1200.5 }], total: 1200.5, received: 0, balance: 1200.5, paymentState: "No payment recorded" } };
    const html = open(); expect(html).toContain("Matching website booking #7"); expect(html).toContain("No payment recorded");
    expect(html).toContain("synthetic@example.test"); expect(html).toContain("Accommodation");
  });
  it.each(["unavailable", "ambiguous"])("clearly explains website lookup %s", websiteBookingState => {
    mocks.details = { reservation: { ...stay(), email: null, phone: null, currency: null }, websiteBooking: null, websiteBookingState };
    const html = open(); expect(html).toContain(websiteBookingState === "unavailable" ? "lookup is unavailable" : "More than one website record");
  });
  it("renders safe retry errors while retaining original full dates", () => {
    mocks.error = { data: { code: "INTERNAL_SERVER_ERROR" }, message: "sensitive upstream error" };
    const html = open(); expect(html).toContain("could not be loaded"); expect(html).toContain("October 29, 2026");
    expect(html).toContain("Retry details"); expect(html).not.toContain("sensitive upstream error");
  });
  it("withholds stale private detail data after admin authorization failure", () => {
    mocks.details = { reservation: { ...stay(), email: "stale@example.test" }, websiteBooking: { id: 7 } };
    mocks.error = { data: { code: "FORBIDDEN" } };
    const html = open(); expect(html).toContain("Sign in again"); expect(html).not.toContain("stale@example.test"); expect(html).not.toContain("Retry details");
  });
  it("closing details leaves an existing create-booking selection unchanged", () => {
    const selection = { propertySlug: "the-briar", checkIn: "2026-12-05", checkOut: "2026-12-07" };
    mocks.state.set(5, selection); open();
    const details = elements().find(node => typeof node.props.onClose === "function");
    details.props.onClose(); const html = render(); expect(html).not.toContain("Reservation details"); expect(mocks.state.get(5)).toEqual(selection);
  });
});
