import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { ENV } from "./_core/env";
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), token: vi.fn(), fetch: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./hostaway-auth", () => ({ getAccessToken: mocks.token }));
import { getCalendarReservationDetails } from "./calendar-reservation-details";
import { router } from "./_core/trpc";
const testRouter = router({ details: getCalendarReservationDetails });
const input = { reservationId: 101, propertySlug: "the-briar" };
const raw = () => ({ id: 101, listingMapId: 329641, guestName: "Synthetic guest", channelName: "Airbnb", status: "new",
  arrivalDate: "2026-10-29", departureDate: "2026-12-03", numberOfGuests: 4, totalPrice: "1200.50", currency: "USD",
  guestEmail: "synthetic@example.test", phone: "+1 555 0100", guestIdUrl: "private-document", stripePaymentIntentId: "private-card",
});
const booking = (overrides = {}) => ({ id: 7, hostawayReservationId: "101", propertyId: "the-briar", hostawayListingId: 329641,
  guestEmail: "linked@example.test", guestPhone: "5550101", status: "confirmed", bookingSource: "owner",
  subtotal: "1000.00", cleaningFee: "100", taxAmount: "90", totalAmount: "1200.50", paidAmount: null,
  discountCodeLabel: "Returning guest", discountCodeAmount: "25", addonsSnapshot: '[{"name":"Early arrival","price":35.5}]', ...overrides });
const caller = (user: unknown = { role: "admin" }, cookie?: string) => testRouter.createCaller({ user, req: { headers: { cookie } }, res: {} } as any);
function database(rows: any[]) {
  const builder: any = {};
  for (const method of ["from", "where"]) builder[method] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(rows);
  const select = vi.fn(() => builder);
  mocks.getDb.mockResolvedValue({ select });
  return { builder, select };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.token.mockResolvedValue("synthetic-read-token");
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: raw() }) });
  database([]);
});

describe("calendar reservation details: private read-only API", () => {
  it.each([null, { role: "user" }])("rejects non-admin context before reading Hostaway or storage: %j", async user => {
    await expect(caller(user).details(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.token).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("accepts a valid standalone owner admin session", async () => {
    const cookie = await new SignJWT({ type: "admin", username: "synthetic-owner" }).setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m").sign(new TextEncoder().encode(ENV.cookieSecret));
    expect((await caller(null, `admin_session=${cookie}`).details(input)).reservation.id).toBe(101);
  });
  it("rejects invalid/expired standalone cookies without reading data", async () => {
    await expect(caller(null, "admin_session=not-a-jwt").details(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "101/path"]) ("rejects invalid reservation identity %j", async reservationId => {
    await expect(caller().details({ ...input, reservationId } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["unknown", "__proto__", "constructor"])("rejects unknown property %s before the external read", async propertySlug => {
    await expect(caller().details({ ...input, propertySlug })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("reads GET only and returns full original dates/nights and an allowlisted contact projection", async () => {
    const result = await caller().details(input);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledWith("https://api.hostaway.com/v1/reservations/101?includeResources=0", expect.objectContaining({ method: "GET" }));
    expect(result.reservation).toMatchObject({ arrivalDate: "2026-10-29", departureDate: "2026-12-03", nights: 35,
      numberOfGuests: 4, email: "synthetic@example.test", phone: "+1 555 0100", totalPrice: 1200.5 });
    expect(JSON.stringify(result)).not.toMatch(/private-document|private-card|stripePaymentIntentId|guestIdUrl/);
    expect(result.websiteBookingState).toBe("not_found"); expect(result.websiteBooking).toBeNull();
  });
  it.each([{ id: 102 }, { listingMapId: 329642 }, { listingMapId: undefined }, { id: undefined }])("fails closed for mismatched Hostaway identity %j", async change => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: { ...raw(), ...change } }) });
    await expect(caller().details(input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it.each([{ arrivalDate: "2026-02-30" }, { departureDate: "2026-10-28" }, { departureDate: "2026-12-03T00:00:00Z" }])("rejects missing or malformed full dates %j", async change => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: { ...raw(), ...change } }) });
    await expect(caller().details(input)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
  it("scopes website record lookup by reservation AND property/listing and excludes sensitive columns", async () => {
    const { builder, select } = database([booking()]);
    const result = await caller().details(input);
    const sql = new MySqlDialect().sqlToQuery(builder.where.mock.calls[0][0]);
    expect(sql.params).toEqual(["101", "the-briar", 329641]);
    expect(sql.sql).toContain(" and "); expect(builder.limit).toHaveBeenCalledWith(2);
    expect(Object.keys(select.mock.calls[0][0])).not.toEqual(expect.arrayContaining(["guestIdUrl", "stripeCustomerId", "depositHoldIntentId"]));
    expect(result.websiteBooking).toMatchObject({ id: 7, received: 0, balance: 1200.5, paymentState: "No payment recorded" });
    expect(result.websiteBooking?.items).toContainEqual({ label: "Returning guest", amount: -25 });
    expect(result.websiteBooking?.items).toContainEqual({ label: "Early arrival", amount: 35.5 });
  });
  it.each([{ hostawayReservationId: "999" }, { propertyId: "alamo-house" }, { hostawayListingId: 329644 }])("never uses an unrelated website record %j", async change => {
    database([booking(change)]);
    expect((await caller().details(input)).websiteBooking).toBeNull();
  });
  it("withholds ambiguous website links rather than choosing one", async () => {
    database([booking(), booking({ id: 8 })]);
    const result = await caller().details(input);
    expect(result.websiteBookingState).toBe("ambiguous"); expect(result.websiteBooking).toBeNull();
  });
  it.each([["0", "No payment recorded"], ["300", "Partially paid"], ["1200.50", "Paid"]])("reports owner receipt %s honestly", async (paidAmount, paymentState) => {
    database([booking({ paidAmount })]);
    expect((await caller().details(input)).websiteBooking?.paymentState).toBe(paymentState);
  });
  it("does not infer payment from a confirmed website reservation either", async () => {
    database([booking({ bookingSource: "website", paidAmount: null })]);
    expect((await caller().details(input)).websiteBooking).toMatchObject({ received: null, balance: null, paymentState: "Not independently verified" });
  });
  it("keeps Hostaway details when the website lookup fails", async () => {
    mocks.getDb.mockRejectedValue(new Error("synthetic DB failure"));
    const result = await caller().details(input);
    expect(result.websiteBookingState).toBe("unavailable"); expect(result.reservation.id).toBe(101);
  });
  it("does not invent missing contact, guest count, total or currency and normalizes cancellation", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: { ...raw(), guestEmail: "invalid", phone: null,
      numberOfGuests: null, totalPrice: "", currency: null, isCancelled: true } }) });
    expect((await caller().details(input)).reservation).toMatchObject({ email: null, phone: null, numberOfGuests: null, totalPrice: null, currency: null, status: "cancelled" });
  });
  it.each([404, 500])("returns safe errors for Hostaway %s without touching storage", async status => {
    mocks.fetch.mockResolvedValue({ ok: false, status });
    await expect(caller().details(input)).rejects.toMatchObject({ code: status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
