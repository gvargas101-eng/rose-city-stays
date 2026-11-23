import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { guestProfiles, guestSyncState, hostawayGuestReservations } from "../drizzle/schema";
const { getDbMock, accessTokenMock } = vi.hoisted(() => ({ getDbMock: vi.fn(), accessTokenMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
vi.mock("./hostaway-auth", () => ({ getAccessToken: accessTokenMock }));
import { hostawayGuestName, syncAllHostawayGuests, syncRecentHostawayGuests, upsertGuestFromHostawayReservation } from "./hostaway-guests";

let sources: Map<string, any>;
let profile: any;
let states: any[];
let updates: any[];
const dialect = new MySqlDialect();
const page = (rows: any[]) => ({ ok: true, status: 200, json: async () => ({ result: rows }) });
const reservation = (id: number) => ({ id, status: "new", guestName: "Alice Example", guestEmail: "alice@example.test", arrivalDate: "2026-01-02", listingMapId: 329644 });

beforeEach(() => {
  vi.clearAllMocks();
  sources = new Map(); states = []; updates = [];
  profile = { id: 1, fullName: "Alice Example", firstName: "Alice", lastName: "Example", totalReservations: 0 };
  accessTokenMock.mockResolvedValue("synthetic-token");
  const db: any = {
    select: () => {
      let table: any, condition: any;
      const query: any = {
        from(value: any) { table = value; return query; },
        where(value: any) { condition = value; return query; },
        limit: async () => {
          if (table === guestProfiles) return [profile];
          if (table === hostawayGuestReservations) {
            const id = String(dialect.sqlToQuery(condition).params[0]);
            return sources.has(id) ? [sources.get(id)] : [];
          }
          return [];
        },
      };
      return query;
    },
    insert: (table: any) => ({ values: (data: any) => {
      const apply = (set?: any) => {
        if (table === hostawayGuestReservations) sources.set(data.hostawayReservationId, { ...data, ...set });
        if (table === guestSyncState) states.push({ ...data, ...set });
        return [{ insertId: 1, affectedRows: 1 }];
      };
      const promise: any = Promise.resolve([{ insertId: 1 }]);
      promise.onDuplicateKeyUpdate = ({ set }: any) => Promise.resolve(apply(set));
      return promise;
    } }),
    update: (table: any) => ({ set: (data: any) => ({ where: async () => {
      updates.push({ table, data });
      if (table === guestProfiles) profile = { ...profile, ...data };
      return [{ affectedRows: 1 }];
    } }) }),
  };
  getDbMock.mockResolvedValue(db);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("historical guest import", () => {
  it("imports beyond the first 100 records and is idempotent when repeated", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => reservation(index + 1));
    vi.mocked(fetch).mockResolvedValueOnce(page(rows) as any).mockResolvedValueOnce(page([reservation(101)]) as any);
    const result = await syncAllHostawayGuests("historical");
    expect(result).toMatchObject({ processed: 101, createdReservations: 101 });
    expect(new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams.get("offset")).toBe("100");
    expect(states.at(-1)).toMatchObject({ lastStatus: "success", lastImportedReservations: 101 });
    expect(states.at(-1).lastHistoricalImportAt).toBeInstanceOf(Date);
    vi.mocked(fetch).mockResolvedValueOnce(page([reservation(1)]) as any);
    expect(await syncAllHostawayGuests("historical")).toMatchObject({ processed: 1, createdReservations: 0, updatedReservations: 1 });
    expect(profile.totalReservations).toBe(101);
    for (const [url, init] of vi.mocked(fetch).mock.calls) {
      expect(String(url)).toContain("/reservations?");
      expect(init?.method ?? "GET").toBe("GET");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });
  it("rejects malformed provider responses instead of falsely reporting an empty successful import", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ status: "failed" }) } as any);
    await expect(syncAllHostawayGuests("historical")).rejects.toThrow("invalid guest-import page");
    expect(states.at(-1).lastStatus).toBe("failed");
    expect(states.at(-1).lastHistoricalImportAt).toBeNull();
  });
  it("reports an API error without marking the directory successfully imported", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as any);
    await expect(syncAllHostawayGuests("historical")).rejects.toThrow("503");
    expect(states.at(-1)).toMatchObject({ lastStatus: "failed", lastImportedReservations: 0 });
  });
  it("detects a full repeated page instead of endlessly reimporting it", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => reservation(index + 1));
    vi.mocked(fetch).mockResolvedValue(page(rows) as any);
    await expect(syncAllHostawayGuests("historical")).rejects.toThrow("pagination did not advance");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toMatchObject({ lastStatus: "failed", lastImportedReservations: 100 });
  });
  it("reuses an active import and prevents recent reconciliation from racing it", async () => {
    let resolve!: (value: any) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(value => { resolve = value; }));
    const first = syncAllHostawayGuests("historical");
    const repeated = syncAllHostawayGuests("historical");
    expect(repeated).toBe(first);
    expect(await syncRecentHostawayGuests()).toMatchObject({ processed: 0 });
    while (!resolve) await Promise.resolve();
    resolve(page([reservation(1)]));
    expect(await first).toMatchObject({ processed: 1 });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
  it("keeps an existing guest's name when Hostaway omits it", async () => {
    await upsertGuestFromHostawayReservation({ id: 1, status: "new", guestEmail: "alice@example.test" });
    expect(profile).toMatchObject({ fullName: "Alice Example", firstName: "Alice", lastName: "Example" });
  });
  it("uses first and last names if a full name is not supplied", () => {
    expect(hostawayGuestName({ guestName: " ", guestFirstName: " Alice ", guestLastName: " Example " })).toBe("Alice Example");
    expect(hostawayGuestName({ guestName: "A. Example", guestFirstName: "Alice" })).toBe("A. Example");
    expect(hostawayGuestName({ guestName: null, guestFirstName: null })).toBeNull();
  });
});
