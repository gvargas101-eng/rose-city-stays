import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUtcMonthDays, getUtcTimelineDays } from "../client/src/lib/calendarDates";
import { getCalendarMonthSegments, getCalendarMonthTone } from "../client/src/lib/calendarMonths";

const mocks = vi.hoisted(() => ({
  data: [] as any[] | undefined,
  isLoading: false,
  isFetching: false,
  query: vi.fn(),
  refetch: vi.fn(),
  stateIndex: 0,
  stateOverrides: new Map<number, unknown>(),
  stateUpdates: new Map<number, unknown>(),
  tree: null as any,
}));

vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = mocks.stateIndex++;
      const initialValue = mocks.stateOverrides.has(index)
        ? mocks.stateOverrides.get(index)
        : mocks.stateUpdates.has(index) ? mocks.stateUpdates.get(index) : initial;
      const [value, setValue] = actual.useState(initialValue);
      return [value, (next: any) => {
        const previous = mocks.stateUpdates.has(index) ? mocks.stateUpdates.get(index) : value;
        mocks.stateUpdates.set(index, typeof next === "function" ? next(previous) : next);
        setValue(next);
      }];
    },
  };
});
vi.mock("@/lib/trpc", () => ({ trpc: { hostaway: { calendar: { useQuery: () => ({ data: undefined, isFetching: false, error: null, refetch: vi.fn() }) } }, admin: {
  getReservationsForCalendar: { useQuery: (...args: unknown[]) => {
    mocks.query(...args);
    return { data: mocks.data, isLoading: mocks.isLoading, isFetching: mocks.isFetching, refetch: mocks.refetch };
  } },
} } }));

import AdminCalendar from "../client/src/pages/admin/AdminCalendar";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { innerWidth: 1200, scrollY: 25, setTimeout: vi.fn() });
  mocks.stateOverrides.set(0, new Date("2026-11-01T00:00:00Z"));
});
afterEach(() => {
  mocks.data = [];
  mocks.isLoading = false;
  mocks.isFetching = false;
  mocks.stateIndex = 0;
  mocks.stateOverrides.clear();
  mocks.stateUpdates.clear();
  mocks.tree = null;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Capture the component's actual React element tree while hooks run inside the
// server renderer, so assertions can exercise its handlers without a DOM/API.
function render() {
  mocks.stateIndex = 0;
  function CalendarUnderTest() {
    mocks.tree = AdminCalendar();
    return mocks.tree;
  }
  return renderToStaticMarkup(React.createElement(CalendarUnderTest));
}
function elements(...args: any[]): any[] {
  const node = args.length ? args[0] : mocks.tree;
  if (Array.isArray(node)) return node.flatMap(child => elements(child));
  if (!React.isValidElement(node)) return [];
  return [node, ...elements((node.props as any).children)];
}
function text(node: any): string {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join("");
  if (React.isValidElement(node)) return text((node.props as any).children);
  return String(node);
}
function monthButtons() {
  const landmark = elements().find(node =>
    (node.type === "nav" || node.props.role === "navigation") && node.props["aria-label"] === "Calendar months");
  expect(landmark, "an accessible month navigation landmark").toBeDefined();
  return elements(landmark).filter(node => String(node.props["aria-label"] ?? "").startsWith("Jump to "));
}
function activeMonthKeys() {
  return monthButtons().filter(node => [true, "true"].includes(node.props["aria-current"]))
    .map(node => node.props["data-month-key"]);
}
function scroller() {
  const element = elements().find(node => node.type === "div" && typeof node.props.onScroll === "function");
  expect(element, "the horizontal calendar scroller").toBeDefined();
  const scrollTo = vi.fn();
  const target = { scrollTo, scrollLeft: 0, clientWidth: 50, scrollWidth: (30 + 31 + 31) * 32 + 160 };
  element.props.ref.current = target;
  return { element, target, scrollTo };
}
function reservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, guestName: "November Bridge", channelName: "Airbnb", status: "confirmed",
    arrivalDate: "2026-11-29", departureDate: "2026-12-03", numberOfGuests: 3, totalPrice: 456.75,
    ...overrides,
  };
}
function bars() {
  return elements().filter(node => typeof node.props.onMouseEnter === "function" && typeof node.props.onMouseLeave === "function");
}
function expectClasses(className: string, required: string) {
  const tokens = new Set(className.split(/\s+/));
  for (const token of required.split(/\s+/).filter(Boolean)) expect(tokens.has(token), `missing ${token}`).toBe(true);
}

describe("calendar month segmentation", () => {
  it("creates contiguous month bands across the year boundary", () => {
    const segments = getCalendarMonthSegments(getUtcTimelineDays(2026, 10, 3));
    expect(segments).toEqual([
      expect.objectContaining({ key: "2026-11", label: "November 2026", shortLabel: "Nov 2026", startCol: 0, dayCount: 30 }),
      expect.objectContaining({ key: "2026-12", label: "December 2026", shortLabel: "Dec 2026", startCol: 30, dayCount: 31 }),
      expect.objectContaining({ key: "2027-01", label: "January 2027", shortLabel: "Jan 2027", startCol: 30 + 31, dayCount: 31 }),
    ]);
    expect(segments.map(segment => segment.dayCount * 32)).toEqual([30 * 32, 31 * 32, 31 * 32]);
    expect(new Set(segments.map(segment => segment.toneIndex)).size).toBe(3);
  });

  it.each([[2027, 28], [2028, 29]])("handles February %i without gaps or dropped leap days", (year, count) => {
    const days = getUtcTimelineDays(year, 0, 3);
    const segments = getCalendarMonthSegments(days);
    expect(segments.map(segment => ({ startCol: segment.startCol, dayCount: segment.dayCount }))).toEqual([
      { startCol: 0, dayCount: 31 }, { startCol: 31, dayCount: count }, { startCol: 31 + count, dayCount: 31 },
    ]);
    expect(segments[1]).toMatchObject({ key: `${year}-02`, label: `February ${year}`, shortLabel: `Feb ${year}` });
    expect(days[31 + count - 1].date).toBe(`${year}-02-${count}`);
    expect(segments.reduce((sum, segment) => sum + segment.dayCount, 0)).toBe(days.length);
  });

  it("uses actual visible columns for partial months and handles an empty timeline", () => {
    const days = [...getUtcMonthDays(2026, 10).slice(-2), ...getUtcMonthDays(2026, 11).slice(0, 3)];
    expect(getCalendarMonthSegments(days)).toEqual([
      expect.objectContaining({ key: "2026-11", startCol: 0, dayCount: 2 }),
      expect.objectContaining({ key: "2026-12", startCol: 2, dayCount: 3 }),
    ]);
    expect(getCalendarMonthSegments([])).toEqual([]);
  });

  it("keeps four distinct month tones stable across timeline offsets and years", () => {
    const firstFour = ["2026-01", "2026-02", "2026-03", "2026-04"].map(getCalendarMonthTone);
    for (const field of ["header", "day", "weekend", "grid", "boundary", "chip"] as const) {
      expect(new Set(firstFour.map(tone => tone[field])).size).toBe(4);
      for (const tone of firstFour) expect(tone[field].trim()).not.toBe("");
    }
    expect(getCalendarMonthTone("2026-05")).toEqual(firstFour[0]);
    expect(getCalendarMonthTone("2026-09")).toEqual(firstFour[0]);
    expect(getCalendarMonthTone("2027-01")).toEqual(firstFour[0]);
    const standalone = getCalendarMonthSegments(getUtcMonthDays(2026, 11))[0];
    const inTimeline = getCalendarMonthSegments(getUtcTimelineDays(2026, 10, 3))[1];
    expect(standalone.toneIndex).toBe(inTimeline.toneIndex);
    expect(standalone.toneIndex).toBeGreaterThanOrEqual(0);
    expect(standalone.toneIndex).toBeLessThan(4);
  });
});

describe("AdminCalendar month rendering and navigation", () => {
  it("renders full month bands and an accessible jump button for every loaded month", () => {
    const html = render();
    const bands = elements().filter(node => node.props["data-month-band"]);
    expect(bands.map(node => node.props["data-month-band"])).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(bands.map(node => node.props.style.width)).toEqual([30 * 32, 31 * 32, 31 * 32]);
    expect(bands.map(text)).toEqual(["November 2026", "December 2026", "January 2027"]);
    expect(monthButtons().map(node => ({ key: node.props["data-month-key"], label: node.props["aria-label"] }))).toEqual([
      { key: "2026-11", label: "Jump to November 2026" },
      { key: "2026-12", label: "Jump to December 2026" },
      { key: "2027-01", label: "Jump to January 2027" },
    ]);
    expect(activeMonthKeys()).toEqual(["2026-11"]);
    expect(html).toContain('aria-current="true"');
    expect(mocks.query).toHaveBeenCalledWith({ startDate: "2026-11-01", endDate: "2027-02-02" }, expect.any(Object));
  });

  it("renders a leap-February band at its true 29-day width", () => {
    mocks.stateOverrides.set(0, new Date("2028-01-01T00:00:00Z"));
    render();
    const bands = elements().filter(node => node.props["data-month-band"]);
    expect(bands.map(node => node.props["data-month-band"])).toEqual(["2028-01", "2028-02", "2028-03"]);
    expect(bands.map(node => node.props.style.width)).toEqual([31 * 32, 29 * 32, 31 * 32]);
    expect(elements().some(node => node.props["data-calendar-date"] === "2028-02-29")).toBe(true);
  });

  it("applies distinct month tones to bands, days, weekends, chips and first-day grid boundaries", () => {
    render();
    const bands = elements().filter(node => node.props["data-month-band"]);
    const buttons = monthButtons();
    const headers = elements().filter(node => node.props["data-calendar-date"]);
    expect(headers).toHaveLength(30 + 31 + 31);
    expect(headers.map(node => node.props["data-calendar-date"])).toEqual(getUtcTimelineDays(2026, 10, 3).map(day => day.date));
    for (const band of bands) {
      const key = band.props["data-month-band"];
      const tone = getCalendarMonthTone(key);
      expectClasses(band.props.className, tone.header);
      expectClasses(buttons.find(button => button.props["data-month-key"] === key).props.className, tone.chip);
      const monthHeaders = headers.filter(header => header.props["data-month-key"] === key);
      expect(monthHeaders.length).toBe(band.props.style.width / 32);
      for (const header of monthHeaders) {
        const weekday = new Date(`${header.props["data-calendar-date"]}T00:00:00Z`).getUTCDay();
        // The current-day accent may replace the normal month background.
        if (header.props["data-calendar-date"] !== "2026-11-15") {
          expectClasses(header.props.className, weekday === 0 || weekday === 6 ? tone.weekend : tone.day);
        }
      }
      const boundaries = elements().filter(node => node.props["data-month-boundary"] === `${key}-01`);
      expect(boundaries.length).toBeGreaterThan(0);
      for (const boundary of boundaries) {
        expectClasses(boundary.props.className, tone.grid);
        expectClasses(boundary.props.className, tone.boundary);
      }
    }
    expect(new Set(elements().filter(node => node.props["data-month-boundary"]).map(node => node.props["data-month-boundary"])))
      .toEqual(new Set(["2026-11-01", "2026-12-01", "2027-01-01"]));
  });

  it("jumps to the chosen month column without changing the query range or splitting the timeline", () => {
    render();
    const { scrollTo } = scroller();
    const december = monthButtons().find(node => node.props["data-month-key"] === "2026-12");
    expect(december.props.type).toBe("button");
    december.props.onClick();
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ left: 30 * 32, behavior: "auto" });
    render();
    expect(activeMonthKeys()).toEqual(["2026-12"]);
    expect(elements().filter(node => node.props["data-month-band"])).toHaveLength(3);
    expect(mocks.query.mock.calls.at(-1)?.[0]).toEqual({ startDate: "2026-11-01", endDate: "2027-02-02" });
    const nextScroller = scroller();
    monthButtons().find(node => node.props["data-month-key"] === "2027-01").props.onClick();
    expect(nextScroller.scrollTo).toHaveBeenCalledWith({ left: (30 + 31) * 32, behavior: "auto" });
  });

  it("updates the current month when the calendar is manually scrolled", () => {
    render();
    const { element, target } = scroller();
    target.scrollLeft = (30 + 31) * 32 + 8;
    element.props.onScroll({ currentTarget: target });
    render();
    expect(activeMonthKeys()).toEqual(["2027-01"]);
    expect(elements().filter(node => node.props["data-month-band"])).toHaveLength(3);
  });

  it("retains the reservation loading state without rendering an empty calendar", () => {
    mocks.data = undefined;
    mocks.isLoading = true;
    const html = render();
    expect(html).toContain("Loading reservations from Hostaway…");
    expect(elements().filter(node => node.props["data-month-band"])).toHaveLength(0);
    expect(elements().filter(node => node.props["data-calendar-date"])).toHaveLength(0);
    expect(bars()).toHaveLength(0);
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});

describe("AdminCalendar reservation regressions across month boundaries", () => {
  it("keeps each month/year-crossing stay as one correctly positioned bar and hides canceled reservations", () => {
    mocks.data = [{ propertySlug: "the-briar", reservations: [
      reservation(),
      reservation({ id: 2, guestName: "Year Bridge", channelName: "VRBO", arrivalDate: "2026-12-30", departureDate: "2027-01-03" }),
      reservation({ id: 3, guestName: "Cancelled Guest", status: "cancelled" }),
      reservation({ id: 4, guestName: "Canceled Guest", status: "canceled" }),
      reservation({ id: 5, guestName: "Flagged Guest", isCancelled: true }),
    ] }];
    const html = render();
    expect(bars()).toHaveLength(2);
    const november = bars().find(bar => text(bar) === "November Bridge");
    const year = bars().find(bar => text(bar) === "Year Bridge");
    expect(november.props.style).toMatchObject({ left: 160 + 28 * 32, width: 4 * 32 - 2 });
    expect(year.props.style).toMatchObject({ left: 160 + (30 + 29) * 32, width: 4 * 32 - 2 });
    expectClasses(november.props.className, "bg-rose-500 border-rose-600 text-white");
    expectClasses(year.props.className, "bg-blue-500 border-blue-600 text-white");
    expect(html).toContain("The Briar: 2 reservations");
    for (const name of ["Cancelled Guest", "Canceled Guest", "Flagged Guest"]) expect(html).not.toContain(name);
  });

  it.each([
    ["Airbnb", "bg-rose-500", "border-rose-600"],
    ["HomeAway", "bg-blue-500", "border-blue-600"],
    ["Booking.com", "bg-indigo-500", "border-indigo-600"],
    ["Direct / Website", "bg-emerald-500", "border-emerald-600"],
    ["Other channel", "bg-amber-500", "border-amber-600"],
  ])("preserves %s booking colors rather than recoloring bars with month tones", (channelName, background, border) => {
    mocks.data = [{ propertySlug: "the-briar", reservations: [reservation({ channelName })] }];
    render();
    expect(bars()).toHaveLength(1);
    expectClasses(bars()[0].props.className, `${background} ${border} text-white`);
    expect(bars()[0].props.style.width).toBe(4 * 32 - 2);
  });

  it("preserves complete hover details and clears the tooltip for a year-crossing reservation", () => {
    const stay = reservation({ guestName: "Year Bridge", channelName: "VRBO", arrivalDate: "2026-12-30", departureDate: "2027-01-03" });
    mocks.data = [{ propertySlug: "the-briar", reservations: [stay] }];
    render();
    bars()[0].props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ left: 450, bottom: 220 }) } });
    expect([...mocks.stateUpdates.values()]).toContainEqual({
      guestName: stay.guestName, channelName: stay.channelName, arrivalDate: stay.arrivalDate,
      departureDate: stay.departureDate, numberOfGuests: 3, totalPrice: 456.75, x: 450, y: 220 + 25,
    });
    const html = render();
    for (const detail of ["Channel:", "VRBO", "Check-in:", "2026-12-30", "Check-out:", "2027-01-03", "Guests:", "Total:", "$456.75"]) {
      expect(html).toContain(detail);
    }
    expect(bars()).toHaveLength(1);
    bars()[0].props.onMouseLeave();
    expect(render()).not.toContain("Check-in:");
    expect(bars()).toHaveLength(1);
  });
});
