# Hostaway duplicate deposit failure diagnosis

## Verified finding

A current direct website reservation has two separate Hostaway Guest Payment records:

1. A paid offline charge called `Direct website payment (Stripe)` for the full reservation amount.
2. A Hostaway-generated `$500` `Deposit` pre-authorization from auto-payment rule `56258`, with status `holdFail` and the message `Reservation payment card is not found`.

The reservation itself reports `paymentStatus: Paid` and `remainingBalance: 0`. The failed entry is not the website's Stripe security-deposit hold. It is a duplicate Hostaway attempt to place its own hold through Hostaway's payment system. The website collects and administers its separate Stripe hold, but does not transfer the guest card to Hostaway.

## Relevant Hostaway configuration observed

Hostaway public API reports these active auto-payment lines:

- Auto-invoice/template ID `55981`
  - Auto-charge `56257`: `Reservation`, 100% online charge at reservation creation.
  - Auto-charge `56258`: `Deposit`, $500 online pre-authorization, scheduled 48 hours before departure.

For direct website/API reservations, Hostaway can create this automatic pre-authorization even when the full stay payment was recorded as an offline paid charge. Since no card is stored in Hostaway for website checkout guests, the Hostaway pre-authorization fails.

## Recommended resolution

Keep the website's Stripe security-deposit workflow as the single source of truth for website bookings. In Hostaway, edit the auto-payment template and exclude the `Hostaway Direct` / direct API channel from the $500 `Deposit` pre-authorization (or remove that deposit line if Hostaway is no longer intended to manage deposits for any channel). Preserve the template for channels that should continue using Hostaway-managed holds.

Existing failed Hostaway pre-authorizations can be cancelled in the Hostaway dashboard. They did not collect money and do not change the reservation's Paid status.

## Sources

- https://support.hostaway.com/hc/en-us/articles/54050957523739-How-Auto-payments-Work-with-API-Reservations-and-Offline-Charges
- https://support.hostaway.com/hc/en-us/articles/360036454133-Automating-Guest-Payments-General-Rules
- https://support.hostaway.com/hc/en-us/articles/10351861667867-Create-an-Automated-Pre-Authorization-for-Refundable-Damage-Deposit
- https://api.hostaway.com/documentation
