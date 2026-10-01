import { describe, expect, it } from "vitest";
import { bookings } from "../drizzle/schema";

describe("bookings checkout persistence schema", () => {
  it("defines the fields required by direct checkout, security holds, SMS consent, and reusable Stripe customers", () => {
    expect(bookings.smsConsentAt.name).toBe("smsConsentAt");
    expect(bookings.stripeCustomerId.name).toBe("stripeCustomerId");
    expect(bookings.depositHoldAmount.name).toBe("depositHoldAmount");
    expect(bookings.discountCodeId.name).toBe("discountCodeId");
    expect(bookings.addonsSnapshot.name).toBe("addonsSnapshot");
  });
});
