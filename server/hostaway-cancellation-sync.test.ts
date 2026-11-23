import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { getTableName } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getAccessToken: vi.fn(), fetch: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./hostaway-auth", () => ({ getAccessToken: mocks.getAccessToken }));
vi.mock("stripe", () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock("./hostaway-sync", () => ({ syncHostawayListings: vi.fn() }));
vi.mock("./blog-writer", () => ({ generateBlogPost: vi.fn() }));

import { refreshLinkedHostawayBookingStatuses, syncHostawayReservationById, syncWebsiteBookingCancellation } from "./hostaway-guests";
import { hostawayCancellationKey } from "../shared/bookingCancellation";
import { adminRouter } from "./routers/admin";

const dialect = new MySqlDialect();
type Booking = { id: number; hostawayReservationId: string | null; status: string; stripePaymentIntentId: string; depositHoldStatus: string };
type Link = { id: number; bookingId: number | null; hostawayReservationId: string; status: string };
let bookingRows: Booking[];
let linkRows: Link[];
let settings: Map<string, string>;
let writes: Array<{ table: string; patch: Record<string, unknown> }>;
let guestDirectoryUnavailable: boolean;

function dbMock() {
  return {
    select: vi.fn(() => ({
      from: (table: any) => {
        const name = getTableName(table);
        const rows = () => {
          if (name === "bookings") return bookingRows.map(row => ({ ...row }));
          if (name === "manual_booking_links") return linkRows.map(row => ({ ...row }));
          if (name === "site_settings") return Array.from(settings, ([key, value]) => ({ key, value }));
          if (guestDirectoryUnavailable) throw new Error(`Table ${name} does not exist`);
          return [];
        };
        return {
          where: (condition: any) => {
            const query = dialect.sqlToQuery(condition);
            const filtered = async () => {
              const result = rows();
              if (name === "bookings" || name === "manual_booking_links") {
                return result.filter((row: any) => query.params.includes(row.hostawayReservationId));
              }
              return result;
            };
            const promise = Promise.resolve().then(filtered);
            return Object.assign(promise, { limit: async () => (await promise).slice(0, 1) });
          },
          orderBy: async () => rows(),
          then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(rows).then(resolve, reject),
        };
      },
    })),
    insert: vi.fn((table: any) => ({
      values: (value: any) => ({
        onDuplicateKeyUpdate: async () => {
          const name = getTableName(table);
          if (name === "site_settings") settings.set(value.key, value.value);
          else if (guestDirectoryUnavailable) throw new Error(`Table ${name} does not exist`);
        },
      }),
    })),
    update: vi.fn((table: any) => ({
      set: (patch: Record<string, unknown>) => ({
        where: async (condition: any) => {
          const name = getTableName(table);
          writes.push({ table: name, patch });
          const query = dialect.sqlToQuery(condition);
          expect(query.sql).toContain("`bookings`.`status` <>");
          let affectedRows = 0;
          for (const row of bookingRows) {
            if (row.status !== "cancelled" && (query.params.includes(row.hostawayReservationId) ||
              (row.hostawayReservationId === null && query.params.includes(row.id)))) {
              Object.assign(row, patch);
              affectedRows++;
            }
          }
          return [{ affectedRows }];
        },
      }),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  guestDirectoryUnavailable = true;
  bookingRows = [
    { id: 1, hostawayReservationId: "101", status: "confirmed", stripePaymentIntentId: "pi_paid", depositHoldStatus: "authorized" },
    { id: 2, hostawayReservationId: "102", status: "confirmed", stripePaymentIntentId: "pi_other", depositHoldStatus: "released" },
    { id: 3, hostawayReservationId: null, status: "paid", stripePaymentIntentId: "pi_link", depositHoldStatus: "authorized" },
  ];
  linkRows = [
    { id: 1, bookingId: 3, hostawayReservationId: "101", status: "paid" },
    { id: 2, bookingId: null, hostawayReservationId: "900", status: "paid" },
  ];
  settings = new Map();
  writes = [];
  mocks.getDb.mockResolvedValue(dbMock());
  mocks.getAccessToken.mockResolvedValue("test-token");
  mocks.fetch.mockImplementation(async (url: string) => {
    const id = url.split("/").pop();
    return new Response(JSON.stringify({ result: { id, status: "cancelled" } }), { status: 200 });
  });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("website Hostaway cancellation propagation", () => {
  it("persists canonical and manual-booking fallback cancellation without touching paid links, Stripe references, or deposit holds", async () => {
    expect(await syncWebsiteBookingCancellation({ id: "101", status: "CANCELED" })).toBe(2);
    expect(bookingRows.map(row => row.status)).toEqual(["cancelled", "confirmed", "cancelled"]);
    expect(bookingRows[0]).toMatchObject({ stripePaymentIntentId: "pi_paid", depositHoldStatus: "authorized" });
    expect(linkRows.map(row => row.status)).toEqual(["paid", "paid"]);
    expect(writes).toEqual([{ table: "bookings", patch: { status: "cancelled" } }]);
  });

  it("is idempotent and stale active statuses never revive cancellation", async () => {
    expect(await syncWebsiteBookingCancellation({ id: "101", isCancelled: "true" })).toBe(2);
    expect(await syncWebsiteBookingCancellation({ id: "101", isCancelled: 1 })).toBe(0);
    expect(await syncWebsiteBookingCancellation({ id: "101", status: "confirmed" })).toBe(0);
    expect(bookingRows[0].status).toBe("cancelled");
    expect(settings.get(hostawayCancellationKey("101"))).toBe("cancelled");
  });

  it("persists legacy manual cancellation when no canonical booking exists", async () => {
    expect(await syncWebsiteBookingCancellation({ id: "900", status: "cancelled" })).toBe(0);
    expect(settings.get(hostawayCancellationKey("900"))).toBe("cancelled");
    expect(linkRows[1].status).toBe("paid");
  });

  it("does not copy cancellation markers for unrelated OTA reservations", async () => {
    expect(await syncWebsiteBookingCancellation({ id: "777", status: "cancelled" })).toBe(0);
    expect(settings.size).toBe(0);
    expect(writes).toEqual([]);
  });

  it("does not cancel a manual booking subsequently moved to a different Hostaway reservation", async () => {
    bookingRows[2].hostawayReservationId = "555";
    await syncWebsiteBookingCancellation({ id: "101", status: "cancelled" });
    expect(bookingRows[2].status).toBe("paid");
  });

  it("acknowledges cancellation despite absent optional guest-directory tables", async () => {
    const result = await syncHostawayReservationById("101");
    expect(result).toMatchObject({ guestDirectorySynced: false });
    expect(bookingRows[0].status).toBe("cancelled");
    expect(settings.get(hostawayCancellationKey("101"))).toBe("cancelled");
  });

  it("does not swallow failure to persist critical cancellation state", async () => {
    const db = dbMock();
    db.update.mockImplementation(() => { throw new Error("Booking write failed"); });
    mocks.getDb.mockResolvedValue(db);
    await expect(syncHostawayReservationById("101")).rejects.toThrow("Booking write failed");
  });
});

describe("bounded read-only Hostaway status refresh", () => {
  it("deduplicates linked IDs, uses reservation GETs only, and touches no guest tables", async () => {
    const result = await refreshLinkedHostawayBookingStatuses(["101", "900", "101"]);
    expect(result).toEqual({ checked: 2, cancelled: 2, updatedBookings: 2, failedReservationIds: [] });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of mocks.fetch.mock.calls) {
      expect(url).toMatch(/^https:\/\/api\.hostaway\.com\/v1\/reservations\/\d+$/);
      expect(options.method).toBeUndefined();
      expect(options.body).toBeUndefined();
      expect(options.signal).toBeDefined();
    }
  });

  it("does not revive a persisted cancellation after a stale confirmed refresh", async () => {
    await syncWebsiteBookingCancellation({ id: "101", status: "cancelled" });
    mocks.fetch.mockImplementation(async () => new Response(JSON.stringify({ result: { id: "101", status: "confirmed" } }), { status: 200 }));
    expect(await refreshLinkedHostawayBookingStatuses(["101"])).toEqual({ checked: 1, cancelled: 0, updatedBookings: 0, failedReservationIds: [] });
    expect(bookingRows[0].status).toBe("cancelled");
    expect(settings.get(hostawayCancellationKey("101"))).toBe("cancelled");
  });

  it("rejects arbitrary unlinked IDs before any external requests", async () => {
    await expect(refreshLinkedHostawayBookingStatuses(["404"])).rejects.toThrow("Only linked");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("bounds batch size and rejects invalid IDs", async () => {
    await expect(refreshLinkedHostawayBookingStatuses(Array.from({ length: 26 }, (_, i) => String(i + 1)))).rejects.toThrow("Invalid status refresh batch");
    await expect(refreshLinkedHostawayBookingStatuses(["101/../../x"])).rejects.toThrow("Invalid status refresh batch");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("reports failures individually without hiding a successful cancellation", async () => {
    mocks.fetch.mockImplementation(async (url: string) => url.endsWith("/900")
      ? new Response("{}", { status: 503 })
      : new Response(JSON.stringify({ result: { id: "101", isCanceled: 1 } }), { status: 200 }));
    expect(await refreshLinkedHostawayBookingStatuses(["101", "900"])).toEqual({ checked: 1, cancelled: 1, updatedBookings: 2, failedReservationIds: ["900"] });
  });

  it("rejects mismatched API reservation IDs rather than canceling an unrelated booking", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ result: { id: "102", status: "cancelled" } }), { status: 200 }));
    const result = await refreshLinkedHostawayBookingStatuses(["101"]);
    expect(result.failedReservationIds).toEqual(["101"]);
    expect(bookingRows[1].status).toBe("confirmed");
  });
});

function context(role?: "admin" | "user") {
  return { user: role ? { id: 1, role } : null, req: { headers: {} }, res: {} } as any;
}
describe("admin reservation status contract", () => {
  it.each([undefined, "user"] as const)("protects refresh from non-admin role %s", async role => {
    await expect(adminRouter.createCaller(context(role)).refreshBookingStatuses({ reservationIds: ["101"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("lets an authenticated admin refresh only linked website reservations", async () => {
    expect(await adminRouter.createCaller(context("admin")).refreshBookingStatuses({ reservationIds: ["101"] })).toMatchObject({ checked: 1, cancelled: 1 });
  });
  it("projects durable legacy cancellation while preserving paid manual-link status", async () => {
    await syncWebsiteBookingCancellation({ id: "900", status: "canceled" });
    const links = await adminRouter.createCaller(context("admin")).listManualBookingLinks();
    expect(links.find((link: any) => link.id === 2)).toMatchObject({ status: "paid", bookingStatus: "cancelled" });
    expect(links.find((link: any) => link.id === 1)).toMatchObject({ status: "paid", bookingStatus: "paid" });
  });
});
