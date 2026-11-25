# Discount lifetime caps — enforcement contract

## Rules

Each campaign has a configurable absolute lifetime successful-use cap per normalized guest email (default 3). Normalization is `trim().toLowerCase()`; legacy usage counts use SQL `LOWER(TRIM(guestEmail))` without modifying history. An admin can set an email-specific **absolute cap**, including zero, or restore the campaign default with `newLimit: null`. A cap of 5 with 3 historical uses permits 2 more, not 5. Successful uses are never deleted, reset, or refunded by this implementation. Campaign total caps, inactive/expiry/property rules still apply even with an override.

Public code validation is advisory. Final checkout requires the actual entered code and revalidates/reserves atomically. An ID by itself, a custom client amount/label without code, or the client's previously applied code state cannot grant a discount. The server calculates and snapshots the actual campaign amount and label. An optional ID accompanying the code must agree with it. Stripe-native promotion-code entry is disabled.

Coupon discount applies to the nightly subtotal alone and is clamped to that amount. Stripe lodging is reduced directly, leaving cleaning, tax, extra-guest/custom fees, add-ons and deposits unchanged. Percent and fixed amounts are rounded in cents. Admin-created coupons reject percent values above 100; historical overlarge percentages are clamped safely rather than changed in the database.

## Concurrency, pending attempts, settlement

`discount_code_claims` is a separate temporary-capacity ledger. Every reservation, release and successful settlement takes a database `SELECT ... FOR UPDATE` lock on its campaign row. Claim operations use READ COMMITTED transactions to avoid stale repeatable-read snapshots after waiting for locks. Both guest and campaign checks include existing successful usage plus pending capacity; two concurrent requests cannot issue the last available discounted checkout twice. An issued checkout retains capacity even if the owner later lowers a cap or pauses the campaign.

Only provider-paid confirmation records a successful use; failed/unpaid attempts never create `discount_code_uses` records. A durable claim is committed before Checkout issuance, Stripe receives a claim-based idempotency key, and paid webhook/return-page races settle that claim exactly once. A unique `(discountCodeId, bookingId)` index guards legacy booking replay without deleting prior rows.

Lazy reconciliation runs when a code is validated or a coupon checkout starts. A paid session settles even if the webhook was delayed; a definitively expired-unpaid session releases capacity. Open, unknown, timed-out, or ambiguous provider outcomes do not release on local time alone, preventing a delayed payment from bypassing limits. Definitive Stripe request/auth/permission rejection during issuance releases temporary capacity. A verified expired manual session can be retried with a fresh claim/idempotency key while its old claim history remains retained.

## Owner/manual paths

A legacy manual payment link with an attached campaign ID must use the same campaign checks and exact server-calculated coupon amount. Its guest email must match the owner-stored email. Changing the guest email, stale amount, exhausted code, expiry or property restrictions cannot bypass enforcement. Owner custom nightly discounts and named credits **without a coupon ID** remain explicit owner concessions and do not consume guest coupon usage.

Parent integrated `reserveDiscount` before inserting a coupon-bearing canonical owner stay and binds the claim inside the booking transaction. Pending/unpaid owner stays intentionally retain temporary campaign/guest capacity; successful usage is recorded once only when the owner stay is confirmed and canonical `paidAmount >= totalAmount`. `settleOwnerDiscountClaim(bookingId)` verifies owner claim/email/amount and never fabricates a Stripe session ID for external receipts. Owner balance settlement commits the financial receipt first, then attempts coupon settlement; coupon ledger failure cannot roll back or erase money actually received. Existing owner balance links never apply another coupon or recalculate the reservation total.

## Migration and validation

Generated and reviewed `drizzle/0030_public_king_cobra.sql` contains only two new tables, their indexes, and the usage code/booking uniqueness guard. A clearly named equivalent SQL with pre/post checks is `drizzle/migrations/2026-11-24_discount_guest_lifetime_caps_additive.sql`. Apply only one, not both. Parent reports generated 0030 was already applied through the managed SQL tool; do not reapply. Parent must verify all five historical rows remain identical, no original campaign values changed, and new tables are initially empty. Duplicate existing non-null code/booking groups must be reviewed rather than deleted if encountered.

Focused run: 183 tests pass across 8 files (`discount-admin`, `discount-claims`, `discount-checkout`, existing booking, owner payments, owner bookings, admin manual booking, manual-booking UI). This includes 39 new tests (25 helper, 8 checkout, 6 admin). `pnpm check` passes. All tests mock DB, Stripe and Hostaway; no live payment/provider/booking mutations or test rows were created by this agent. Parent owns final full-suite run and policy-snapshot integration.

## Bounded limitations and operational review

- The identity is guest email, not a verified natural-person identity. Different email addresses remain distinct guests by contract.
- A provider/network/DB failure after possible Checkout issuance with no stored session ID retains safe capacity and requires owner reconciliation; automatic time-based release would be unsafe. The admin lists pending counts but does not offer an unsafe release button. No new scheduled automation was added.
- Reconciliation is lazy, not a background janitor. Abandoned open sessions retain temporary capacity until Stripe expiration is verified on a subsequent request. Unpaid owner stays intentionally retain capacity until reviewed/canceled or paid; cancellation claim-release policy is outside this change.
- Legacy paid sessions issued before claim support cannot be retroactively prevented from exceeding a cap; existing successful history remains authoritative and immutable. Coupon-bearing legacy manual sessions missing a claim fail closed and require owner reconciliation instead of silently counting an unreserved discount.
- A manual coupon use may settle before its canonical booking is created, leaving the successful usage row's nullable booking ID unset while the durable claim is later bound to that booking. It is still counted accurately and replay-protected by the claim. Historical rows are never repointed.
- Global nightly-rate/date/availability quote integrity, general Hostaway fulfillment idempotency, and legacy manual non-coupon reservation creation races are separate pre-existing concerns; this change only guarantees coupon capacity/usage concurrency and settlement idempotency.
