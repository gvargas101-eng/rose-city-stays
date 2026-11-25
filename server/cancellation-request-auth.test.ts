import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import { cancellationsRouter } from "./routers/cancellations";
const ctx = (role?: "user" | "admin") => ({ user: role ? { id: 1, openId: "owner-test", role } : null, req: { headers: {}, ip: "127.0.0.1", socket: {} }, res: {} }) as any;
const review = { id: 1, status: "reviewed" as const, notes: "Original reservation contact needs verification", administrativeOnlyAcknowledged: true as const };

describe("cancellation review authorization", () => {
  beforeEach(() => { mocks.getDb.mockReset(); });
  it.each([undefined, "user"] as const)("blocks request listing without admin rights: %s", async role => {
    await expect(cancellationsRouter.createCaller(ctx(role)).list({ status: "all" })).rejects.toThrow();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it.each([undefined, "user"] as const)("blocks review mutations without admin rights: %s", async role => {
    await expect(cancellationsRouter.createCaller(ctx(role)).review(review)).rejects.toThrow();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("requires explicit administrative-only acknowledgment", async () => {
    await expect(cancellationsRouter.createCaller(ctx("admin")).review({ ...review, administrativeOnlyAcknowledged: false } as any)).rejects.toThrow();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("saves only request status/notes for an administrator", async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const update = vi.fn().mockReturnValue({ set });
    mocks.getDb.mockResolvedValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: 1 }]) }) }) }), update });
    expect(await cancellationsRouter.createCaller(ctx("admin")).review(review)).toEqual({ saved: true, administrativeOnly: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "reviewed", reviewNotes: review.notes, reviewedBy: "owner-test" }));
    expect(set.mock.calls[0][0]).not.toHaveProperty("depositHoldStatus");
    expect(set.mock.calls[0][0]).not.toHaveProperty("paidAmount");
  });
  it("returns a sanitized temporary failure rather than database/PII details", async () => {
    mocks.getDb.mockRejectedValue(new Error("SQL included private@example.com"));
    await expect(cancellationsRouter.createCaller(ctx()).submit({ requestKey: "d60e1c75-113e-4331-9f6e-ff6c9956ef58", reservationReference: "12345", bookingEmail: "guest@example.com", reason: "Plans changed", acknowledged: true })).rejects.toThrow("Requests are temporarily unavailable");
  });
});
