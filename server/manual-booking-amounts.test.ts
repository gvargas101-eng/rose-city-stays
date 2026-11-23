import { describe, expect, it } from "vitest";
import { getManualBookingAmounts, getNightlyDiscount, validateManualBookingAmounts } from "../shared/manualBookingAmounts";

const base = { nightlyRate: 150, nights: 3, cleaningFee: 125, extraGuestFee: 0, taxAmount: 40.5, discountAmount: 0 };

describe("custom manual booking accounting", () => {
  it("applies multiple labeled credits and charges without losing their sign", () => {
    const result = validateManualBookingAmounts({ ...base, discountAmount: 45, customLineItems: [
      { label: "Pet fee", amount: 50 }, { label: "Courtesy credit", amount: -70 }, { label: "Cleaning credit", amount: -25 },
    ] });
    expect(result).toEqual({ subtotal: 450, customCharges: 50, credits: 95, discountAmount: 45, stripeDiscountAmount: 140, total: 525.5 });
  });
  it("calculates percentage discounts only on lodging, never fees or taxes", () => {
    expect(getNightlyDiscount(450, "percent", 10)).toBe(45);
    expect(getNightlyDiscount(450, "fixed", 32.45)).toBe(32.45);
  });
  it("permits credits against any charge, separately from the nightly discount", () => {
    expect(validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Waive cleaning", amount: -125 }] }).total).toBe(490.5);
  });
  it("uses cent arithmetic across several decimal adjustments", () => {
    expect(getManualBookingAmounts({ ...base, nightlyRate: 0.1, nights: 3, cleaningFee: 0.2, taxAmount: 0, customLineItems: [{ label: "Adjustment", amount: -0.1 }] }).total).toBe(0.4);
  });
  it("rejects excessive discounts, credits, blank labels and invalid amounts", () => {
    expect(() => validateManualBookingAmounts({ ...base, discountAmount: 451 })).toThrow("nightly subtotal");
    expect(() => validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Credit", amount: -616 }] })).toThrow("at least $0.50");
    expect(() => validateManualBookingAmounts({ ...base, customLineItems: [{ label: "", amount: -10 }] })).toThrow("label");
    expect(() => validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Credit", amount: NaN }] })).toThrow("label");
    expect(() => validateManualBookingAmounts({ ...base, taxAmount: -1 })).toThrow("nonnegative");
    expect(() => validateManualBookingAmounts({ ...base, nightlyRate: 150.005 })).toThrow("two decimal");
    expect(() => validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Credit", amount: -10.005 }] })).toThrow("two decimal");
  });
  it("allows a minimum payable booking but not a fully credited unpaid one", () => {
    expect(validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Credit", amount: -615 }] }).total).toBe(0.5);
    expect(() => validateManualBookingAmounts({ ...base, customLineItems: [{ label: "Credit", amount: -615.5 }] })).toThrow("fully credited");
  });
});
