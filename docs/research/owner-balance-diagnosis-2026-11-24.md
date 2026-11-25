# Owner balance-link diagnosis — November 24, 2026

The website's getHostawayOwnerPaymentState requests GET /v1/reservations/{id} without includePayments=1. Hostaway's official Reservation object says remainingBalance is returned only with includePayments=1. That omission caused optional payment-link failures on successfully created owner bookings.

Source: https://api.hostaway.com/documentation — Reservation object, remainingBalance.

Read-only database diagnostics confirmed #840001 and #840002 are confirmed owner reservations, each total $2,002.00 with recorded paid amount $0.00. Both errors explicitly state the reservation was created and only its optional payment link failed. No guest contacts were logged.

Read-only Hostaway GET checks with includePayments=1 returned remainingBalance $2,002.00 on reservation IDs 72252832 and 72252923, matching the website. Initially, each also had an awaiting credit_card_online stay-payment charge of $2,002.00 and a separate awaitingHold preAuth of $500.00. The native schedule must not run alongside website balance collection; do not bypass that guard or cancel separate deposit holds.

Hostaway confirms API reservations can automatically receive an assigned auto-payment template. Offline receipts do not suppress scheduling of remaining unpaid amounts.
Source: https://support.hostaway.com/hc/en-us/articles/54050957523739-How-Auto-payments-Work-with-API-Reservations-and-Offline-Charges

The code fix requests payment details and strictly validates the returned balance; preserves cancellation, receipt synchronization, competing native collection and cross-token Stripe reconciliation; gives separate actionable cancellation, scheduled-payment and real-balance-mismatch errors; and clears only obsolete optional-link failure warnings after successful retry. Admin Bookings already has Generate payment link for balance for an existing owner reservation, so retrying need not create another stay.

Full validation: 37 files / 385 tests, TypeScript, production build and diff checks passed. Managed screenshots rendered the admin login screen; owner UI success/error paths were tested with synthetic mocks, not live submissions.

At the later 19:17 UTC read-only check, 72252832's native stay charge 36060519 had changed from awaiting to failed; 72252923's stay charge 36060571 remained awaiting. Both $500 deposit preAuths (36060520 and 36060572) remained awaitingHold. These state changes occurred outside this task; no payment mutation requests were made.

At 19:18 UTC the owner selected website payment links for these two bookings. The owner then chose to operate their Chrome session personally; screenshots were used to identify the stay-charge Cancel action, not Cancel Reservation. The two charge IDs matched the earlier API checks. No account credentials were received and the agent did not cancel any charges.

At 19:37 UTC the owner reported canceling both stay payments. Fresh read-only GETs verified both native charge IDs are cancelled, both reservations retain status new, both Hostaway balances remain $2,002.00, both separate $500 preAuths remain awaitingHold, and the guarded balance reader reports no competing scheduled stay collection. AwaitingHold is a future hold schedule, not an active bank authorization.

At 19:39 UTC the agent verified exactly website bookings #840001 / hollytree-king-bed / Hostaway72252832 and #840002 / noir-hollytree / Hostaway72252923 remain confirmed owner bookings, total $2,002 and recorded paid $0, then invoked createOwnerPaymentLink for each with seven-day expiry. This created/reused only existing-reservation website balance tokens and cleared obsolete optional-link warnings. It did not create Stripe checkout sessions, charge cards, send guest messages, create reservations, alter dates or change deposit holds.

Generated website URLs, expiring December 1, 2026 around 1:39 PM America/Chicago:
- #840001: https://www.rosecitystays.com/booking/pay/0c60c4811b832d57090887a415844cff509603cabb47c214
- #840002: https://www.rosecitystays.com/booking/pay/4da32d3d5e72104efa46a0d1e57dd84c982c3f56a37ed3ab

Code repair checkpoint: f38fa990; deployment success notification arrived during the 19:28 UTC owner turn, but do not infer new native auto-payment templates were changed. Only these two current charge schedules were canceled by the owner; future owner-created bookings can still receive Hostaway native auto-payment charges unless separately configured.
