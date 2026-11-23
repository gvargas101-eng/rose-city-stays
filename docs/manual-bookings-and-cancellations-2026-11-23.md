# Create actual owner bookings and manage payment links

## Create the reservation yourself

After publishing this update, sign in at [Rose City Stays Manual Bookings](https://www.rosecitystays.com/admin/manual-bookings). The default **Create Booking — Actual Hostaway Reservation** mode creates the real reservation immediately. It is no longer just a payment-link generator.

1. Choose the property, dates, guest count, and guest name/email. Private properties are included; selecting Alamo Crossing Retreat does not publish that listing.
2. Keep the date-specific Hostaway average nightly rate or enter your own rate. Adjust cleaning, extra-guest fees, and custom charges.
3. Use a dollar or percentage nightly discount. Percentage discounts apply only to the nightly subtotal. Add any number of named credits within the supported form limit; credits reduce the reservation price, not the amount of money received. Credits cannot make the total negative.
4. Set the tax rate or custom tax amount, security-deposit amount, guest-facing note, and internal notes. The owner remains responsible for appropriate tax treatment. Individual guest acknowledgment and ID-upload requirements can be bypassed when you have already handled them elsewhere.
5. Enter **Amount received** only for funds you have actually collected outside this checkout. A payment reference is required when this amount is greater than zero. This records an offline receipt; it does not charge a card.
6. If a balance remains, explicitly select **I allow this unpaid balance**. Optionally request a payment link for the remaining amount, not the original reservation total.
7. Click **Review & Create Booking**. Check the guest, property, dates, total, received amount, and balance in the confirmation prompt before approving.

Successful creation shows the website booking ID and Hostaway reservation ID. The reservation is confirmed and blocks its nights even if its payment state is **Unpaid** or **Partially paid**. **Paid** means recorded receipts cover the total. **Complimentary** means the final reservation total is zero; it does not mean cash was collected.

Unavailable or unverified nights are rejected. Actual owner bookings cannot override occupied dates. A fully credited stay is allowed, but a Stripe payment link still needs at least $0.50 outstanding.

## Collect the balance without creating another booking

The optional balance link belongs to the existing reservation. You can also generate it from **Admin → Bookings** for an active owner-created reservation with an outstanding balance. The guest page displays the full reservation total, already received amount, and balance due now. Guests complete any requirements you have not bypassed and then pay through Stripe.

Successful balance payment updates the existing booking and receipt ledger. It does not create another website booking or Hostaway reservation. Replayed payment notifications do not add the same money again. Reservation cancellation and payment receipts remain separate.

**Use only one collection channel.** Hostaway can apply its own automatic payment rules to API-created reservations. The website does not disable those rules. Before issuing a balance link and before starting Checkout, the website checks Hostaway's outstanding balance and competing scheduled collection. If the balance differs or native collection is scheduled, it stops website collection and asks you to review Hostaway. Payments or price changes made outside this website after creation need reconciliation before another website collection. [1]

If a reservation is confirmed but a receipt synchronization or payment-link warning appears, the booking already exists. Do not recreate it or collect recorded funds again. Review the Hostaway reservation and payment records. The website retains funds actually recorded as received even if Hostaway synchronization fails.

## Deposits and later reservation changes

The security deposit is a separate authorization hold, not part of the rental total. Creating an unpaid, externally paid, or complimentary reservation does not provide a saved card and therefore does not place a website hold. The requested deposit appears as pending/not yet authorized. After a successful full-balance website card payment, the website can attempt the requested hold with the saved card; it reports authorization failures honestly. A $0 deposit means no hold is requested.

For this initial owner-booking workflow, make property moves or date extensions in Hostaway. The website's older move/extension tools assume a fully paid website reservation, so they are disabled for owner-created records rather than misusing unpaid amounts as payment credit. Reconcile payment changes before collecting any remaining balance.

## Payment Link Only remains available

Use **Payment Link Only — No Reservation Yet** when you want the guest's successful payment to create the reservation. It retains customizable fees, discounts, named credits, deposit overrides, and individual acknowledgment bypasses. The guest must pay at least $0.50. Ordinary public guest checkout also remains payment-gated; explicit owner-created reservations are the only new unpaid exception.

## Cancellations

Canceled website bookings remain visible in **Admin → Bookings**. Hostaway cancellation variants and flags are recognized independently of guest-directory updates. Paid manual links show reservation cancellation separately from payment state; cancellation is not an automatic refund.

Use **Refresh Hostaway statuses** to reconcile up to 25 linked reservations from the current filtered view. This reads provider status and repairs local cancellation display. It does not cancel a reservation, issue a refund, or release a deposit hold. Late successful payments remain receipts but cannot revive a canceled owner reservation or authorize its deposit.

If reservation creation times out, keep the same request and use its retry rather than resetting the form. The server searches for the original Hostaway request marker before attaching a recovered reservation; it does not repeat the reservation POST. If the result remains uncertain, inspect Hostaway before starting a new request.

## Validation and deployment

The additive owner-origin fields and receipt ledger have been applied without changing existing booking prices or creating live reservations. Existing cancellation repair also remains in place. The preview owner route requires login, and rendering/mocked integration tests cover creation, payment gating, exact totals, receipt replay, cancellation, and guest balance messaging. No real guest booking, card payment, refund, or hold was submitted to test this feature.

The new website behavior requires publishing its tested checkpoint. Publishing this code does not activate Alamo Crossing Retreat; it remains private/unpublished.

## References

[1]: https://support.hostaway.com/hc/en-us/articles/54050957523739-How-Auto-payments-Work-with-API-Reservations-and-Offline-Charges "Hostaway API reservations and automatic payment behavior"
[2]: https://api.hostaway.com/documentation "Hostaway reservation and guest payment API documentation"
[3]: https://support.hostaway.com/hc/en-us/articles/37742826096155-Payment-Status-Guide-for-Hostaway "Hostaway reservation payment status guide"
