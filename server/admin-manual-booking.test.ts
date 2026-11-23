import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, values } = vi.hoisted(() => ({ insert: vi.fn(), values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }));
vi.mock("./db", () => ({ getDb: vi.fn().mockResolvedValue({ insert }) }));
vi.mock("stripe", () => ({ default: vi.fn().mockImplementation(() => ({})) }));
const { adminRouter } = await import("./routers/admin");
const caller = adminRouter.createCaller({ user: { role: "admin" }, req: { headers: {} }, res: {} } as any);
const base = { propertySlug: "the-briar", propertyName: "The Briar", checkIn: Date.parse("2027-01-10T00:00:00Z"), checkOut: Date.parse("2027-01-13T00:00:00Z"), nights: 3, guestCount: 2, nightlyRate: 150, cleaningFee: 125, taxAmount: 40.5, totalAmount: 615.5 };

beforeEach(() => { vi.clearAllMocks(); insert.mockReturnValue({ values }); });

describe("admin manual booking creation", () => {
  it("creates a link with named credits and saves a recomputed itemized net total", async () => {
    const result = await caller.createManualBookingLink({ ...base, discountAmount: 45, discountLabel: "10% nights", totalAmount: 545.5,
      customLineItems: [{ label: "Courtesy credit", amount: -75 }, { label: "Pet fee", amount: 50 }] });
    expect(result.token).toMatch(/^[a-f0-9]{48}$/);
    const saved = values.mock.calls[0][0];
    expect(saved.totalAmount).toBe("545.50");
    expect(saved.status).toBe("active");
    expect(JSON.parse(saved.customLineItems)).toEqual([{ label: "Courtesy credit", amount: -75 }, { label: "Pet fee", amount: 50 }]);
  });
  it("rejects totals that would charge differently in Stripe", async () => {
    await expect(caller.createManualBookingLink({ ...base, totalAmount: 100 })).rejects.toThrow("total does not match");
    expect(insert).not.toHaveBeenCalled();
  });
  it("rejects excessive credits, over-lodging discounts and unnamed adjustments", async () => {
    await expect(caller.createManualBookingLink({ ...base, customLineItems: [{ label: "Credit", amount: -616 }] , totalAmount: 0.1 })).rejects.toThrow("at least $0.50");
    await expect(caller.createManualBookingLink({ ...base, discountAmount: 500 })).rejects.toThrow("nightly subtotal");
    await expect(caller.createManualBookingLink({ ...base, customLineItems: [{ label: "   ", amount: -10 }] })).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
  it("requires an authenticated administrator", async () => {
    const guest = adminRouter.createCaller({ user: null, req: { headers: {} }, res: {} } as any);
    await expect(guest.createManualBookingLink(base)).rejects.toThrow("permission");
    expect(insert).not.toHaveBeenCalled();
  });
});
