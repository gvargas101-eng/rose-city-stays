import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), link: vi.fn() }));
vi.mock("./owner-bookings", async importOriginal => {
  const original = await importOriginal<typeof import("./owner-bookings")>();
  return {
    ...original,
    createOwnerBooking: mocks.create,
    createOwnerPaymentLink: mocks.link,
  };
});
import { ownerBookingsRouter } from "./routers/ownerBookings";
const input = {
  requestKey: "d60e1c75-113e-4331-9f6e-ff6c9956ef58",
  propertySlug: "private",
  checkIn: Date.UTC(2027, 0, 10),
  checkOut: Date.UTC(2027, 0, 12),
  nights: 2,
  guestCount: 4,
  guestName: "Guest",
  guestEmail: "guest@example.com",
  nightlyRate: 200,
  cleaningFee: 100,
  totalAmount: 500,
  allowUnpaid: true,
};
const ctx = (role?: "user" | "admin") =>
  ({
    user: role ? { id: 1, openId: "test-owner", role } : null,
    req: { headers: {} },
    res: {},
  }) as any;
describe("owner bookings access", () => {
  it("does not allow an anonymous guest to create a real unpaid reservation", async () => {
    await expect(
      ownerBookingsRouter.createCaller(ctx()).create(input)
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not allow a non-admin user to create a reservation", async () => {
    await expect(
      ownerBookingsRouter.createCaller(ctx("user")).create(input)
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not expose balance-link issuance publicly", async () => {
    await expect(
      ownerBookingsRouter
        .createCaller(ctx())
        .createPaymentLink({ bookingId: 7 })
    ).rejects.toThrow();
    expect(mocks.link).not.toHaveBeenCalled();
  });
  it("passes an authenticated owner identity to the actual booking service", async () => {
    mocks.create.mockResolvedValue({ bookingId: 7, status: "confirmed" });
    expect(
      await ownerBookingsRouter.createCaller(ctx("admin")).create(input)
    ).toMatchObject({ bookingId: 7 });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ allowUnpaid: true, amountReceived: 0 }),
      "test-owner"
    );
  });
});
