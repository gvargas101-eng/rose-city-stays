import { describe, expect, it } from "vitest";
import { bookingChanges, bookingExtensions, bookings } from "../drizzle/schema";

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
    expect(bookingChanges.hostawayQuotedTotal.name).toBe("hostawayQuotedTotal");
    expect(bookingChanges.priceAdjustment.name).toBe("priceAdjustment");
    expect(bookingChanges.adjustmentReason.name).toBe("adjustmentReason");
    expect(bookingChanges.balanceDue.name).toBe("balanceDue");
    expect(bookingChanges.refundAmount.name).toBe("refundAmount");
    expect(bookingChanges.stripeRefundId.name).toBe("stripeRefundId");
  });
});

describe("stay extension persistence schema", () => {
  it("defines the ledger fields required before an extension can update Hostaway or Stripe", () => {
    expect(bookingExtensions.bookingId.name).toBe("bookingId");
    expect(bookingExtensions.hostawayReservationId.name).toBe("hostawayReservationId");
    expect(bookingExtensions.previousCheckOut.name).toBe("previousCheckOut");
    expect(bookingExtensions.newCheckOut.name).toBe("newCheckOut");
    expect(bookingExtensions.additionalNights.name).toBe("additionalNights");
    expect(bookingExtensions.amount.name).toBe("amount");
    expect(bookingExtensions.hostawayNewTotal.name).toBe("hostawayNewTotal");
    expect(bookingExtensions.stripePaymentIntentId.name).toBe("stripePaymentIntentId");
  });
});
