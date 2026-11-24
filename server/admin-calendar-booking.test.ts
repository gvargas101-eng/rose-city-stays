import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  data: [] as any[], error: null as any, fetching: false,
  availability: undefined as any, availabilityError: null as any, availabilityFetching: false,
  query: vi.fn(), retry: vi.fn(), assign: vi.fn(),
  state: new Map<number, any>(), index: 0, tree: null as any,
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: any) => {
    const index = mocks.index++;
    const [value] = actual.useState(mocks.state.has(index) ? mocks.state.get(index) : initial);
    return [value, (next: any) => mocks.state.set(index, typeof next === "function" ? next(mocks.state.has(index) ? mocks.state.get(index) : value) : next)];
  } };
});
vi.mock("@/lib/trpc", () => ({ trpc: {
  admin: { getReservationsForCalendar: { useQuery: () => ({ data: mocks.data, error: mocks.error, isFetching: mocks.fetching, isLoading: false, refetch: vi.fn() }) } },
  hostaway: { calendar: { useQuery: (...args: any[]) => {
    mocks.query(...args);
    return { data: mocks.availability, error: mocks.availabilityError, isFetching: mocks.availabilityFetching, refetch: mocks.retry };
  } } },
} }));
import AdminCalendar from "../client/src/pages/admin/AdminCalendar";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { innerWidth: 1200, scrollY: 0, location: { assign: mocks.assign }, setTimeout: vi.fn() });
  mocks.state.clear(); mocks.state.set(0, new Date("2026-11-01T00:00:00Z"));
  mocks.data = [{ propertySlug: "the-briar", reservations: [] }, { propertySlug: "alamo-crossing-retreat", reservations: [] }];
  mocks.error = null; mocks.fetching = false; mocks.availability = undefined; mocks.availabilityError = null; mocks.availabilityFetching = false;
  vi.clearAllMocks();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function render() {
  mocks.index = 0;
  function Wrapper() { mocks.tree = AdminCalendar(); return mocks.tree; }
  return renderToStaticMarkup(React.createElement(Wrapper));
}
function elements(...args: any[]): any[] {
  const node = args.length ? args[0] : mocks.tree;
  if (Array.isArray(node)) return node.flatMap(value => elements(value));
  if (!React.isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
function text(node: any): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (React.isValidElement(node)) return text((node.props as any).children);
  return node == null || typeof node === "boolean" ? "" : String(node);
}
function cell(date: string, slug = "the-briar") { return elements().find(node => node.props["data-select-date"] === date && node.props["data-select-property"] === slug); }
function action(label = "Continue to Create Booking") { return elements().find(node => typeof node.props.onClick === "function" && text(node) === label); }
function select(checkIn = "2026-11-29", checkOut = "2026-12-02", slug = "the-briar") {
  render(); cell(checkIn, slug).props.onClick(); render(); cell(checkOut, slug).props.onClick(); return render();
}
function available(dates = ["2026-11-29", "2026-11-30", "2026-12-01"]) {
  return { days: dates.map(date => ({ date, isAvailable: true, status: "available", price: 150, minimumStay: 1 })) };
}

describe("calendar-to-actual-booking interaction", () => {
  it("highlights two clicks in one property and requires live verification before navigation", () => {
    const html = select();
    expect(mocks.state.get(5)).toEqual({ propertySlug: "the-briar", checkIn: "2026-11-29", checkOut: "2026-12-02" });
    expect(html).toContain("3 nights");
    expect(cell("2026-11-30").props["aria-pressed"]).toBe(true);
    expect(cell("2026-12-02").props["aria-pressed"]).toBe(true);
    expect(mocks.query).toHaveBeenLastCalledWith({ propertyId: "the-briar", startDate: "2026-11-29", endDate: "2026-12-02" }, expect.objectContaining({ enabled: true }));
    expect(action().props.disabled).toBe(true);
    action().props.onClick(); expect(mocks.assign).not.toHaveBeenCalled();
    mocks.availability = available(); render();
    expect(action().props.disabled).toBe(false);
    expect(mocks.assign).not.toHaveBeenCalled();
    action().props.onClick();
    expect(mocks.assign).toHaveBeenCalledWith("/admin/manual-bookings?source=calendar&propertySlug=the-briar&checkIn=2026-11-29&checkOut=2026-12-02");
  });
  it("switching properties starts a new partial selection, including private Alamo Crossing", () => {
    select(); cell("2026-12-03", "alamo-crossing-retreat").props.onClick(); render();
    expect(mocks.state.get(5)).toEqual({ propertySlug: "alamo-crossing-retreat", checkIn: "2026-12-03", checkOut: null });
    expect(action().props.disabled).toBe(true);
  });
  it("clears selections without navigation or booking side effects", () => {
    select(); action("Clear selection").props.onClick(); render();
    expect(mocks.state.get(5)).toBeNull();
    expect(action().props.disabled).toBe(true);
    expect(mocks.assign).not.toHaveBeenCalled();
  });
  it("does not allow occupied check-in or ranges that cross another reservation", () => {
    mocks.data[0].reservations = [{ arrivalDate: "2026-11-30", departureDate: "2026-12-03", status: "confirmed", guestName: "Synthetic" }];
    render(); expect(cell("2026-11-30").props.disabled).toBe(true);
    cell("2026-11-29").props.onClick(); render();
    expect(cell("2026-12-04").props.disabled).toBe(false);
    cell("2026-12-04").props.onClick();
    const html = render(); expect(html).toContain("includes an existing reservation");
    expect(mocks.state.get(5).checkOut).toBeNull();
    expect(mocks.assign).not.toHaveBeenCalled();
  });
  it("allows checkout at the next reservation's arrival but never includes that night", () => {
    mocks.data[0].reservations = [{ arrivalDate: "2026-12-02", departureDate: "2026-12-05", status: "confirmed", guestName: "Turnover guest" }];
    render(); cell("2026-11-29").props.onClick(); render();
    expect(cell("2026-12-02").props.disabled).toBe(false);
    expect(cell("2026-12-02").props.className).toContain("z-30");
    cell("2026-12-02").props.onClick(); mocks.availability = available(); render();
    expect(action().props.disabled).toBe(false);
  });
  it("fails closed when reservations fail, a property is missing, or calendar refresh is pending", () => {
    render(); expect(cell("2026-11-29", "hospital-district").props.disabled).toBe(true);
    mocks.error = new Error("synthetic"); const html = render();
    expect(cell("2026-11-29").props.disabled).toBe(true); expect(html).toContain("could not be loaded");
    mocks.error = null; mocks.fetching = true; render(); expect(cell("2026-11-29").props.disabled).toBe(true);
  });
  it("disables Continue during live availability loading and allows retry on failure", () => {
    select(); mocks.availability = available(); mocks.availabilityFetching = true; render();
    expect(action().props.disabled).toBe(true);
    mocks.availabilityFetching = false; mocks.availabilityError = new Error("synthetic");
    const html = render(); expect(action().props.disabled).toBe(true); expect(html).toContain("could not be verified");
    action("Retry availability").props.onClick(); expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it.each(["blocked", "reserved", "missing", "minimum-stay"])("rejects live %s restrictions despite an empty reservation row", restriction => {
    select(); mocks.availability = available();
    if (restriction === "missing") mocks.availability.days.pop();
    else if (restriction === "minimum-stay") mocks.availability.days[0].minimumStay = 4;
    else { mocks.availability.days[1].status = restriction; mocks.availability.days[1].isAvailable = false; }
    render(); expect(action().props.disabled).toBe(true); action().props.onClick(); expect(mocks.assign).not.toHaveBeenCalled();
  });
  it("keeps tonight selectable in Tyler after midnight UTC", () => {
    vi.setSystemTime(new Date("2026-11-24T02:00:00Z")); render();
    expect(cell("2026-11-23").props.disabled).toBe(false);
    expect(cell("2026-11-22").props.disabled).toBe(true);
  });
  it("checks new reservation conflicts again before allowing navigation", () => {
    select(); mocks.availability = available(); render(); expect(action().props.disabled).toBe(false);
    mocks.data = [{ propertySlug: "the-briar", reservations: [{ arrivalDate: "2026-11-30", departureDate: "2026-12-01", status: "new" }] }];
    render(); expect(action().props.disabled).toBe(true); action().props.onClick(); expect(mocks.assign).not.toHaveBeenCalled();
  });
});
