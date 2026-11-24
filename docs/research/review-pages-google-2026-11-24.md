# Website review checks — November 24, 2026

The live https://www.rosecitystays.com/leave-a-review page renders the existing website review form with property, guest display name, optional private email, rating, optional title and review text. No review submission was made during this check.

The live https://www.rosecitystays.com/reviews page displays one existing review and a public host reply, followed by a Leave a Review link. Navbar.tsx contains a Reviews navigation entry. AdminReviews.tsx and server/routers/reviews.ts provide owner-only reply, delete and visibility controls at /admin/reviews. Public projections exclude guest email. The current website code has no review-request sender or Google review button. No account was accessed to establish whether Hostaway already sends a review request.

The user can share https://www.rosecitystays.com/leave-a-review immediately. Property prefill uses ?property=the-briar, for example. No duplicate review page is needed. Recommend keeping post-booking requests in Hostaway, consistent with the owner's previously stated communication preference; confirm native channel and checkout trigger support separately.

Google says genuine reviews may be requested using its business review link or QR code, and prohibits incentives for posting, changing or removing reviews. Use an honest-review request for all eligible guests, not a five-star-only request, and offer the Google destination independently of the website rating. Website reviews do not automatically become Google reviews.

Sources:
- https://www.rosecitystays.com/leave-a-review — live form
- https://www.rosecitystays.com/reviews — live public reviews and host reply
- https://support.google.com/business/answer/3474122?hl=en — review request guidance
- https://support.google.com/business/answer/16816815?hl=en — official review-link/QR instructions

This is an audit only: no live guest reviews, messages, account automation settings, bookings, payments or publication changes were made.
