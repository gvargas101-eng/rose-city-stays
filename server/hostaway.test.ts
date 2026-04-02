import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the hostaway module to avoid real API calls in tests
vi.mock("./hostaway", () => ({
  PROPERTY_TO_HOSTAWAY_ID: {
    "hollytree-golf-dining": 329643,
    "hollytree-townhouse": 366803,
  },
  getPropertyCalendar: vi.fn().mockResolvedValue([
    {
      date: "2026-04-10",
      isAvailable: true,
      status: "available",
      price: 116,
      minimumStay: 2,
    },
    {
      date: "2026-04-11",
      isAvailable: false,
      status: "reserved",
      price: 120,
      minimumStay: 2,
    },
  ]),
  getListingBasePrice: vi.fn().mockResolvedValue(116),
}));

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("hostaway.calendar", () => {
  it("returns calendar days for a valid property", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hostaway.calendar({
      propertyId: "hollytree-golf-dining",
      startDate: "2026-04-10",
      endDate: "2026-04-11",
    });

    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({
      date: "2026-04-10",
      isAvailable: true,
      price: 116,
      minimumStay: 2,
    });
    expect(result.days[1]).toMatchObject({
      date: "2026-04-11",
      isAvailable: false,
      status: "reserved",
    });
  });
});

describe("hostaway.basePrice", () => {
  it("returns the base price for a valid property", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hostaway.basePrice({
      propertyId: "hollytree-golf-dining",
    });

    expect(result.price).toBe(116);
  });
});

describe("hostaway.isSupported", () => {
  it("returns supported=true for a mapped property", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hostaway.isSupported({
      propertyId: "hollytree-golf-dining",
    });

    expect(result.supported).toBe(true);
  });

  it("returns supported=false for an unmapped property", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hostaway.isSupported({
      propertyId: "nonexistent-property",
    });

    expect(result.supported).toBe(false);
  });
});

describe("inquiry.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a valid inquiry and returns success", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inquiry.submit({
      name: "Jane Smith",
      email: "jane@example.com",
      dates: "April 15 – April 20",
      guests: "2",
      property: "Hollytree Golf",
      message: "Looking forward to our stay!",
    });

    expect(result).toEqual({ success: true });
    expect(notifyOwner).toHaveBeenCalledOnce();
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Inquiry from Jane Smith",
        content: expect.stringContaining("jane@example.com"),
      })
    );
  });

  it("rejects inquiry with invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inquiry.submit({
        name: "Jane Smith",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("rejects inquiry with empty name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inquiry.submit({
        name: "",
        email: "jane@example.com",
      })
    ).rejects.toThrow();
  });
});
