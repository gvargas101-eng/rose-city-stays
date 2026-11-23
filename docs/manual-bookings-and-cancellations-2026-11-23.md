# Manual bookings and cancellation status

## Create a manual booking

Open **Admin → Manual Bookings** at https://www.rosecitystays.com/admin/manual-bookings and sign in. Click **Create Booking Link** if the creation form is collapsed.

1. Choose the property (private/unpublished properties are included), dates, guest count, and guest details.
2. Keep the date-specific Hostaway average nightly rate or override it. Adjust cleaning and extra-guest fees as needed.
3. For a nightly discount, choose **Dollars ($)** or **Percent (%)**. Percentage discounts apply to the nightly subtotal, not cleaning or other charges. Managed loyalty codes remain available.
4. Under **Custom Charges & Credits**, click **Add Credit**. Enter a guest-facing label and a positive dollar amount; the system subtracts it. Add several credits or charges if needed. For example, “Courtesy credit” and “Cleaning credit” can be separate lines.
5. Set the tax rate or enter an explicit custom tax amount. General credits do not automatically waive taxes; the owner remains responsible for the correct tax treatment.
6. Set the security-deposit hold amount, required acknowledgments, notes, and expiry. Review **Guest pays**, create the link, and share it by email or Google Messages.

**Important:** This remains a payment-link workflow. The guest pays the remaining balance through Stripe; Hostaway confirmation happens only after successful payment. Credits are owner concessions, not refunds or proof of payments received elsewhere. The amount due must be at least $0.50; unpaid and fully credited/complimentary reservations are not confirmed through this flow. Security deposits are separate holds and are not included in the stay payment.

## Cancellation display

The website reads Hostaway cancellation status independently of optional guest-directory writes. Both “canceled” and “cancelled” provider spellings and corresponding boolean flags are recognized. Canceled website bookings remain visible, with a separate reservation-status label on paid manual links. Payment remains recorded as paid: cancellation does not by itself mean refunded.

In **Admin → Bookings**, use **Refresh Hostaway statuses** to check up to 25 linked reservations from the current filtered view. The operation reads Hostaway and repairs local cancellation state only. It does not cancel reservations, issue refunds, or release deposit holds. Older manual links with no canonical website booking also get an accurate cancellation label through a minimal reservation-status marker.

## Verification on November 23, 2026

- Restored missing `guest_profiles`, `guest_sync_state`, and `hostaway_guest_reservations` tables from the existing reviewed migration. Verified all 18, 9, and 14 expected columns respectively.
- Checked 31 existing linked reservations against the authenticated Hostaway API, with no failed fetches. Five were canceled in Hostaway; two canonical website bookings had stale statuses and were corrected.
- No new reservation, guest payment, refund, or deposit action was performed.
- Added regression coverage for credit accounting, server-side total validation, administrator access, cancellation variants and webhook handling, older manual-link display, and delayed Stripe payment-event replay.
- Final validation passed: 27 test files / 150 tests, TypeScript, production build, and whitespace checks. The owner form and canceled paid-link labels also passed rendering tests. The preview admin page correctly required sign-in; no real guest checkout was submitted.

## Deployment

The database repair and two corrected statuses are already persisted. The new UI and server behavior require publishing the new tested website checkpoint. Publishing the code does **not** activate Alamo Crossing Retreat; that property remains private/unpublished.
