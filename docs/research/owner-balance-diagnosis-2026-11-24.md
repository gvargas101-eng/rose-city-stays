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

At 19:18 UTC the owner selected website payment links for these two bookings. This selects the collection channel, but the earlier choice card explicitly withheld cancellation/charging authorization. Inspect the documented account controls and obtain exact material confirmation before stopping native charge records; keep reservations and holds unchanged. No approval has been assumed and no account settings have been changed.
