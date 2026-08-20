import { describe, expect, it } from "vitest";
import { matchesSmsConsentFilter } from "../client/src/lib/bookingFilters";

describe("matchesSmsConsentFilter", () => {
  it("keeps all bookings when the all filter is selected", () => {
    expect(matchesSmsConsentFilter({ smsConsentAt: 1_786_262_400_000 }, "all")).toBe(true);
    expect(matchesSmsConsentFilter({ smsConsentAt: null }, "all")).toBe(true);
  });

  it("separates opted-in bookings from bookings without SMS consent", () => {
    expect(matchesSmsConsentFilter({ smsConsentAt: 1_786_262_400_000 }, "opted_in")).toBe(true);
    expect(matchesSmsConsentFilter({ smsConsentAt: null }, "opted_in")).toBe(false);
    expect(matchesSmsConsentFilter({ smsConsentAt: null }, "no_consent")).toBe(true);
    expect(matchesSmsConsentFilter({}, "no_consent")).toBe(true);
  });
});
