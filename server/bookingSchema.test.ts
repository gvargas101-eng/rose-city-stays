import { describe, expect, it } from "vitest";
import { bookingChanges, bookings } from "../drizzle/schema";

describe("bookings checkout persistence schema", () => {
  it("defines the fields required by direct checkout, security holds, SMS consent, and reusable Stripe customers", () => {
    expect(bookings.smsConsentAt.name).toBe("smsConsentAt");
    expect(bookings.stripeCustomerId.name).toBe("stripeCustomerId");
    expect(bookings.depositHoldAmount.name).toBe("depositHoldAmount");
    expect(bookings.discountCodeId.name).toBe("discountCodeId");
    expect(bookings.addonsSnapshot.name).toBe("addonsSnapshot");
  });
});

describe("reservation change persistence schema", () => {
  it("defines the fields required for audited moves, extensions, payments, and refunds", () => {
    expect(bookingChanges.bookingId.name).toBe("bookingId");
    expect(bookingChanges.replacementHostawayReservationId.name).toBe("replacementHostawayReservationId");
    expect(bookingChanges.balanceDue.name).toBe("balanceDue");
    expect(bookingChanges.refundAmount.name).toBe("refundAmount");
    expect(bookingChanges.stripeRefundId.name).toBe("stripeRefundId");
  });
});
