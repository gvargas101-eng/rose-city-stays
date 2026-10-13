# Hostaway change-stay integration notes

Research performed 2026-10-13 for the Rose City Stays admin reservation-change feature.

## Confirmed API behavior

- Hostaway's **Update a reservation** endpoint is `PUT /v1/reservations/{reservationId}`. It can update a reservation's supported fields, including dates and price, but Hostaway explicitly documents: **“It’s not possible to update the listingMapId of a reservation with this request.”** A property move must therefore create a replacement direct reservation on the destination listing and then cancel the original reservation only after the replacement succeeds.
- Hostaway's cancellation endpoint is `PUT /v1/reservations/{reservationId}/statuses/cancelled` with `{"cancelledBy":"host"}` or `{"cancelledBy":"guest"}`.
- Hostaway's price-calculation endpoint is `POST /v1/listings/{listingId}/calendar/priceDetails` with `startingDate`, `endingDate`, `numberOfGuests`, and `version: 2`. A live read-only test returned `totalPrice` and component entries including `baseRate`, `cleaningFee`, `hotelTax`, `salesTax`, and a `damageDeposit` that was not included in total price.
- Hostaway's help center says partial and full refunds are available through its dashboard for Stripe-processed charges. The current Public API documentation was reviewed but did not expose a verified public refund-create endpoint. Automated refunds should therefore be made directly through Stripe only after the user sees and confirms the amount.

## Sources

1. https://api.hostaway.com/documentation — “Update a reservation”, “Cancel a reservation”, and “Reservation price calculation”.
2. https://support.hostaway.com/hc/en-us/articles/18904034424219-Guest-Payments-Refunds — “Guest Payments: Refunds”.

## Design implication

The website must not issue a refund automatically as a side effect of moving a stay. It should quote the destination property and dates, apply the original website payment as a credit, collect any positive difference through a Stripe Checkout payment link, and offer an explicit owner-confirmed Stripe refund only if the revised total is lower. A property move should create the new Hostaway reservation first, then cancel the old Hostaway reservation; failures must leave the original untouched.
