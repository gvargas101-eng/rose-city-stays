# Rose City Stays reservation controls

## Open a reservation from the Master Calendar

In **Admin → Master Calendar**, click or tap a colored reservation bar. Keyboard users can focus the bar and press Enter or Space. The details window shows the original full check-in and checkout dates, nights, property, guest and booking channel—even when part of the reservation falls outside the visible calendar.

Contacts and itemized website charges appear only when the exact reservation is safely matched. The Hostaway reservation total is not labeled as money received. Owner-created unpaid reservations remain unpaid. Escape or the close button closes the window; clicking a reservation does not start a new booking.

## Guest cancellation requests

Direct-booking guests can use **My Bookings → Request cancellation**, or `/request-cancellation`. They enter their confirmation reference, booking email and reason, then acknowledge that this is a request only. They do not receive other guests' booking details or an automatic cancellation/refund.

Review requests under **Admin → Cancellation Requests**. Verify the requester through the **original contact on the reservation in Hostaway**, not just the email or phone typed into the form. Review the policy agreed to at booking and actual payment receipts. The form submission time is preserved for your review.

Marking a request reviewed, declined or resolved changes only the request queue. To actually cancel, use Hostaway and verify the reservation is canceled. Separately review outstanding automatic charges/payment links, any refund through the original collection system, and the separate security deposit. Confirm the calendar and website status synchronization before notifying the guest. Do not use a website status dropdown as a substitute for canceling Hostaway.

Future direct bookings use the selected policy: **14 or more days: 100% of the nightly rate; 7–13 days: 50%; fewer than 7 days: no refund. Cleaning fees and taxes are non-refundable.** No-shows and early departures are non-refundable. New booking records preserve the policy text; existing bookings keep their original terms and require historical evidence when no snapshot is available. No automatic refund calculator is enabled.

Airbnb, Vrbo and other third-party guests should request cancellation through the platform where they booked.

## Limit discount codes by guest email

Use **Admin → Discount Codes**. Each code has a default lifetime guest cap, normally **3 uses**, plus optional campaign-wide cap, expiry and property restrictions. The discount applies only to the nightly subtotal, not cleaning, tax, add-ons or security deposits.

Expand the code's **Guest Lifetime Allowance**, enter the booking email and select **Look up usage**. The panel shows successful uses, pending checkout reservations, effective cap and remaining capacity. Set **Absolute lifetime use cap**, then **Save lifetime cap**. For example, if a guest has used a code 3 times, a cap of 5 permits 2 more uses—not 5 extra uses. A cap of 0 blocks new coupon checkouts. **Restore default** removes the override without erasing history.

Limits are enforced again on the server at checkout, not just when the guest types a code. Concurrent pending checkouts reserve capacity; successful payments count once. Abandoned checkouts do not become permanent successful uses. A payable or uncertain checkout retains capacity until Stripe confirms its terminal unpaid state or the owner reconciles it. Existing issued checkouts are not revoked by lowering a cap.

Custom owner credits without a campaign coupon remain separate from coupon usage. Limits identify a guest by normalized booking email; they cannot prove two different email addresses belong to the same person.

## Release status

Validated November 24, 2026: **499 tests across 45 test files passed**, along with TypeScript, the production build and diff checks. Desktop, mobile and keyboard interactions were checked using synthetic reservation data and intercepted APIs; no real bookings, requests or financial actions were submitted for testing.

The new interface and server behavior require publishing this tested checkpoint. Database additions are additive and all five historical discount uses were retained. Existing reservations are not canceled, charged, refunded or given new deposit holds by this update.
