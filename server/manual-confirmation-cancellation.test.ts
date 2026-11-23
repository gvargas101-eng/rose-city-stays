import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), retrieve: vi.fn(), insert: vi.fn(), update: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("stripe", () => ({ default: vi.fn().mockImplementation(() => ({ checkout: { sessions: { retrieve: mocks.retrieve } } })) }));
import { bookingRouter } from "./routers/booking";

let link: any;
let booking: any;
let marker: any;
beforeEach(() => {
  vi.clearAllMocks();
  link = { id: 1, token: "manual-token", status: "paid", bookingId: 42, hostawayReservationId: "12345", securityDepositOverride: "0", totalAmount: "100", propertyName: "Sample", propertySlug: "the-briar" };
  booking = { id: 42, status: "cancelled", hostawayReservationId: "12345", depositHoldAmount: "0", depositHoldStatus: "released" };
  marker = null;
  mocks.retrieve.mockResolvedValue({ id: "cs_paid", payment_status: "paid", metadata: { manual_booking_token: "manual-token", guest_name: "Guest" } });
  mocks.getDb.mockResolvedValue({ insert: mocks.insert, update: mocks.update, select: () => ({ from: (table: any) => ({ where: () => ({ limit: async () => {
    const name = getTableName(table);
    return name === "manual_booking_links" ? [link] : name === "bookings" ? booking ? [booking] : [] : marker ? [marker] : [];
  } }) }) }) });
});
const confirm = () => (bookingRouter.confirmManualBooking as any)._def.resolver({ input: { token: "manual-token", sessionId: "cs_paid" }, ctx: {} });

describe("manual paid confirmation cancellation state", () => {
  it("returns canceled canonical reservation state while preserving a paid link", async () => {
    expect((await confirm()).bookingStatus).toBe("cancelled");
    expect(link.status).toBe("paid");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("returns canceled state for legacy paid links without canonical bookings", async () => {
    link.bookingId = null;
    booking = null;
    marker = { value: "cancelled" };
    expect((await confirm()).bookingStatus).toBe("cancelled");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects a Stripe session belonging to another manual link", async () => {
    mocks.retrieve.mockResolvedValue({ payment_status: "paid", metadata: { manual_booking_token: "another-token" } });
    await expect(confirm()).rejects.toThrow("does not belong");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
