export type SmsConsentFilter = "all" | "opted_in" | "no_consent";

type BookingWithSmsConsent = {
  smsConsentAt?: number | null;
};

export function matchesSmsConsentFilter(
  booking: BookingWithSmsConsent,
  filter: SmsConsentFilter,
) {
  if (filter === "all") return true;
  if (filter === "opted_in") return Boolean(booking.smsConsentAt);
  return !booking.smsConsentAt;
}
