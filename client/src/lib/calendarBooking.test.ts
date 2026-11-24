import { describe, expect, it } from "vitest";
import { buildCalendarBookingUrl, calendarRangeHasConflict, calendarStayNights, isCalendarNightReserved, nextCalendarSelection, parseCalendarBookingDraft, validateCalendarStay } from "./calendarBooking";

const draft = { propertySlug: "the-briar", checkIn: "2026-12-30", checkOut: "2027-01-02" };
const params = (values = {}) => new URLSearchParams({ source: "calendar", ...draft, ...values }).toString();
const reservation = { arrivalDate: "2027-01-02", departureDate: "2027-01-05", status: "confirmed" };
const liveDays = ["2026-12-30", "2026-12-31", "2027-01-01"].map(date => ({ date, isAvailable: true, status: "available", price: 150, minimumStay: 1 }));

describe("calendar booking draft safety", () => {
  it("preserves exact UTC dates across month/year boundaries and transfers only property/dates", () => {
    expect(calendarStayNights(draft.checkIn, draft.checkOut)).toBe(3);
    const url = buildCalendarBookingUrl(draft);
    expect(url).toContain("/admin/manual-bookings?source=calendar");
    expect(parseCalendarBookingDraft(url.split("?")[1])).toEqual(draft);
    expect(parseCalendarBookingDraft(params({ totalAmount: "0", bypassAvailabilityCheck: "true", mode: "link" }))).toEqual(draft);
  });
  it.each([
    { source: "other" }, { propertySlug: "../admin" }, { propertySlug: "" },
    { checkIn: "2026-02-29" }, { checkIn: "2026-13-01" }, { checkIn: "2026-12-30T00:00:00Z" },
    { checkOut: "2026-12-30" }, { checkOut: "2026-12-29" }, { checkOut: "2028-01-03" },
  ])("ignores invalid draft %j", value => expect(parseCalendarBookingDraft(params(value))).toBeNull());
  it("keeps leap-February stay length correct", () => {
    expect(calendarStayNights("2028-02-28", "2028-03-01")).toBe(2);
    expect(calendarStayNights("2027-02-28", "2027-03-01")).toBe(1);
    expect(() => buildCalendarBookingUrl({ ...draft, checkOut: draft.checkIn })).toThrow();
  });
});

describe("calendar property/date selection", () => {
  it("starts with check-in and completes checkout with no booking action", () => {
    const start = nextCalendarSelection(null, "the-briar", draft.checkIn, [reservation]);
    expect(start).toEqual({ selection: { propertySlug: "the-briar", checkIn: draft.checkIn, checkOut: null }, error: null });
    expect(nextCalendarSelection(start.selection, "the-briar", draft.checkOut, [reservation])).toEqual({ selection: draft, error: null });
  });
  it("allows checkout on another guest's arrival and check-in on their departure", () => {
    expect(calendarRangeHasConflict(draft.checkIn, draft.checkOut, [reservation])).toBe(false);
    expect(isCalendarNightReserved("2027-01-02", [reservation])).toBe(true);
    expect(isCalendarNightReserved("2027-01-05", [reservation])).toBe(false);
  });
  it("does not allow check-in or a range through occupied nights", () => {
    expect(nextCalendarSelection(null, "the-briar", "2027-01-03", [reservation]).error).toContain("already");
    const previous = { ...draft, checkOut: null };
    expect(nextCalendarSelection(previous, "the-briar", "2027-01-06", [reservation])).toMatchObject({ selection: previous, error: expect.any(String) });
  });
  it("starts over for a new property, earlier date, or completed selection", () => {
    const previous = { ...draft, checkOut: null };
    expect(nextCalendarSelection(previous, "alamo-crossing-retreat", "2026-12-31", []).selection)
      .toEqual({ propertySlug: "alamo-crossing-retreat", checkIn: "2026-12-31", checkOut: null });
    expect(nextCalendarSelection(previous, "the-briar", "2026-12-29", []).selection?.checkIn).toBe("2026-12-29");
    expect(nextCalendarSelection(draft, "the-briar", "2027-01-06", []).selection?.checkOut).toBeNull();
  });
  it("ignores canceled reservations without ignoring active ones", () => {
    expect(isCalendarNightReserved("2027-01-03", [{ ...reservation, status: "canceled" }])).toBe(false);
    expect(calendarRangeHasConflict("2027-01-01", "2027-01-04", [{ ...reservation, isCancelled: true }])).toBe(false);
  });
});

describe("live Hostaway calendar validation", () => {
  it("checks every stay night and excludes the checkout night", () => expect(validateCalendarStay(draft, liveDays).valid).toBe(true));
  it.each(["blocked", "reserved"])("rejects %s nights even if reservation bars show an empty row", status => {
    expect(validateCalendarStay(draft, liveDays.map((day, index) => index === 1 ? { ...day, isAvailable: false, status } : day)).valid).toBe(false);
  });
  it("fails closed on missing days and contradictory availability status", () => {
    expect(validateCalendarStay(draft, liveDays.slice(1)).valid).toBe(false);
    expect(validateCalendarStay(draft, liveDays.map(day => ({ ...day, status: "blocked" }))).valid).toBe(false);
  });
  it("respects Hostaway minimum stay for the chosen check-in", () => {
    const result = validateCalendarStay(draft, liveDays.map(day => ({ ...day, minimumStay: 4 })));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("4 nights");
  });
});
