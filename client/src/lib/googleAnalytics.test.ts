import { afterEach, describe, expect, it, vi } from "vitest";
import { trackGoogleAnalyticsEvent } from "./googleAnalytics";

describe("trackGoogleAnalyticsEvent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a non-personalized event through GA4 when gtag is available", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    const sent = trackGoogleAnalyticsEvent("begin_checkout", { value: 425, currency: "USD" });

    expect(sent).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "begin_checkout", { value: 425, currency: "USD" });
  });

  it("does not throw when GA4 has not loaded yet", () => {
    vi.stubGlobal("window", {});

    expect(trackGoogleAnalyticsEvent("page_view")).toBe(false);
  });
});
