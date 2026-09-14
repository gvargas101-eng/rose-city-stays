/**
 * GA4 helper. Do not place guest names, emails, phone numbers, IDs, or messages
 * in analytics events. The measurement ID is public and belongs to the existing
 * Rose City Stays GA4 web data stream.
 */
export const GA4_MEASUREMENT_ID = "G-H1TSCV17BB";

type AnalyticsParameters = Record<string, unknown>;
type Gtag = (command: "event" | "config", target: string, parameters?: AnalyticsParameters) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function trackGoogleAnalyticsEvent(eventName: string, parameters: AnalyticsParameters = {}): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  window.gtag("event", eventName, parameters);
  return true;
}

export function trackGoogleAnalyticsPageView(pagePath: string): boolean {
  return trackGoogleAnalyticsEvent("page_view", {
    page_path: pagePath,
    page_location: typeof window === "undefined" ? undefined : window.location.href,
    page_title: typeof document === "undefined" ? undefined : document.title,
  });
}
