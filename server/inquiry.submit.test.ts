import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the notifyOwner function
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

describe("inquiry.submit", () => {
  it("returns success for a valid inquiry", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inquiry.submit({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "555-1234",
      dates: "April 15 – April 20",
      guests: "2",
      property: "Hollytree Golf",
      message: "Looking forward to our stay!",
    });

    expect(result).toEqual({ success: true });
  });

  it("returns success with only required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inquiry.submit({
      name: "Bob",
      email: "bob@example.com",
    });

    expect(result).toEqual({ success: true });
  });

  it("throws on invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inquiry.submit({
        name: "Bad Email",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("throws on empty name", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inquiry.submit({
        name: "",
        email: "test@example.com",
      })
    ).rejects.toThrow();
  });
});
