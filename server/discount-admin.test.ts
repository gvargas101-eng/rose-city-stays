import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ delete: vi.fn(), insert: vi.fn(), set: vi.fn(), dc: { id: 1, maxUsesPerGuest: 3 }, usage: vi.fn() }));
vi.mock("./discount-claims", () => ({ normalizeDiscountEmail: (e: string) => e.trim().toLowerCase(), getDiscountUsage: m.usage, quoteDiscount: vi.fn(), reconcileDiscountClaims: vi.fn() }));
vi.mock("./db", () => {
  const api = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => { const query: any = Promise.resolve([m.dc]); query.for = async () => [m.dc]; return query; } }) }) }),
    insert: (table: any) => ({ values: (value: any) => { m.insert(table, value); return { onDuplicateKeyUpdate: async (update: any) => { m.set(update); } }; } }),
    delete: (table: any) => { m.delete(table); return { where: async () => [] }; },
    transaction: (fn: any) => fn(api),
  };
  return { getDb: async () => api };
});
import { discountCodesRouter } from "./routers/discountCodes";
import { discountCodeGuestOverrides, discountCodeUses } from "../drizzle/schema";
const caller = () => discountCodesRouter.createCaller({ user: { id: 1, role: "admin" } } as any);
beforeEach(() => { vi.clearAllMocks(); m.usage.mockResolvedValue({ uses: 3, totalUses: 5, pending: 1, totalPending: 1, overrideLimit: 5, defaultLimit: 3, effectiveLimit: 5, remaining: 1 }); });
describe("admin guest lifetime allowance", () => {
  it("persists an absolute override without deleting successful history", async () => {
    const result = await caller().setGuestLimit({ codeId: 1, guestEmail: "  GUEST@Example.com  ", newLimit: 5 });
    expect(m.insert).toHaveBeenCalledWith(discountCodeGuestOverrides, { discountCodeId: 1, guestEmail: "guest@example.com", maxUses: 5 });
    expect(m.set).toHaveBeenCalledWith({ set: { maxUses: 5 } });
    expect(m.delete).not.toHaveBeenCalled(); expect(result.message).toContain("History retained");
  });
  it("zero is valid and blocks new uses rather than falling back to three", async () => {
    await caller().setGuestLimit({ codeId: 1, guestEmail: "guest@example.com", newLimit: 0 });
    expect(m.insert.mock.calls[0][1].maxUses).toBe(0);
  });
  it("restoring default deletes only override, never usage", async () => {
    await caller().setGuestLimit({ codeId: 1, guestEmail: "guest@example.com", newLimit: null });
    expect(m.delete).toHaveBeenCalledWith(discountCodeGuestOverrides);
    expect(m.delete).not.toHaveBeenCalledWith(discountCodeUses);
  });
  it("reports success, pending, effective cap and remaining separately", async () => {
    const result = await caller().getGuestUses({ codeId: 1, guestEmail: " GUEST@example.com " });
    expect(result).toMatchObject({ guestEmail: "guest@example.com", uses: 3, pending: 1, effectiveLimit: 5, remaining: 1 });
  });
  it("rejects fractional/negative guest caps", async () => {
    await expect(caller().setGuestLimit({ codeId: 1, guestEmail: "guest@example.com", newLimit: -1 })).rejects.toThrow();
    await expect(caller().setGuestLimit({ codeId: 1, guestEmail: "guest@example.com", newLimit: 3.9 })).rejects.toThrow();
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("requires admin authorization", async () => {
    await expect(discountCodesRouter.createCaller({ user: { id: 2, role: "user" } } as any).setGuestLimit({ codeId: 1, guestEmail: "guest@example.com", newLimit: 5 })).rejects.toThrow();
    expect(m.insert).not.toHaveBeenCalled();
  });
});
