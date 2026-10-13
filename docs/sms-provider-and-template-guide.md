# Rose City Stays SMS Provider and Template Guide

## Recommended setup

Use **Twilio** for automated website texts, payment links, reservation-change balances, and pre-arrival reminders. It is the best fit for this site because it has a mature SMS API, delivery-status webhooks, toll-free or local business numbers, and direct integration with the existing booking and Stripe workflows. Keep **Hostaway** as the communication system for Airbnb, VRBO, and other channel reservations after they are confirmed.

Use one dedicated **Rose City Stays** phone number. Do not use a personal number for automated texts. Messages sent through an SMS provider do not appear in a personal Google Messages account; the website should instead maintain the sent-message status and use a provider inbox or a future shared inbox view.

Twilio’s current US list price is **$0.0083 per SMS segment**, plus carrier fees. A local number is **$1.15 per month**. An application sending from a US local number must complete A2P 10DLC business and campaign registration. [1] [2]

**Lower-cost alternative: Telnyx.** Telnyx lists US local SMS at **$0.004 per message part plus carrier fees**, and local numbers at **$1/month**. Its published A2P fees include a $4.50 brand application, a $15 campaign review, and ongoing campaign fees that vary by campaign type. Choose Telnyx if minimizing per-message cost matters more than having Twilio’s larger ecosystem and simpler implementation path. [3] [4]

**Best choice for Rose City Stays:** start with **Twilio + a local 10DLC number**. It is a good operational fit for an 11-property portfolio with payment links, change-of-stay payments, and a low-to-moderate volume of guest communication. If the team later needs a shared conversation inbox and business calling, evaluate **Quo (formerly OpenPhone)** as the inbox layer, not as the website’s first messaging API.

## Compliance rules to build in

Only text direct-booking guests who opted in to SMS. The existing site records booking SMS consent; keep that as the operational-message permission record. For promotional texts to past guests, collect **separate marketing SMS consent**—email consent or a previous stay alone is not enough.

Every automated text should include the Rose City Stays name. Promotional texts must also include a clear opt-out instruction such as `Reply STOP to opt out.` Never send door codes, uploaded ID details, payment-card details, or full sensitive reservation details by text. Use a secure site or Hostaway link instead.

Before sending the first automated text, register the business and campaign with the provider. A2P 10DLC registration requires an identified sender and a campaign description explaining the opt-in, opt-out, help, and message-purpose flow. [2]

## Recommended automated flows

| Trigger | Audience | Purpose | Timing |
|---|---|---|---|
| Manual booking link created | Opted-in direct guest | Deliver secure payment link | Immediately; one reminder before expiry |
| Reservation change balance due | Opted-in direct guest | Deliver secure change-payment link | Immediately after owner creates it |
| Reservation confirmed | Opted-in direct guest | Confirmation and next steps | Immediately after payment/Hostaway confirmation |
| Arrival reminder | Opted-in confirmed direct guest | Direct guest to secure arrival information | 3 days before check-in |
| Review request | Opted-in completed direct guest | Ask for a direct review | 1–2 days after checkout |
| Loyalty offer | Separate marketing opt-in only | Bring prior direct guests back | Limited, segmented campaigns |

For Airbnb, VRBO, Booking.com, and other OTA reservations, continue to communicate in the channel/Hostaway so the message record remains where the reservation originated.

## Ready-to-use templates

Replace text in brackets before sending. Keep payment and arrival links unique to the guest.

### 1. Manual booking payment link

> Rose City Stays: Hi [First Name], your secure payment link for [Property] ([Check-in]–[Check-out]) is [Payment Link]. It expires [Date/Time]. Reply STOP to opt out.

### 2. Payment-link reminder

> Rose City Stays: Hi [First Name], a payment link for [Property] is still available until [Date/Time]: [Payment Link]. Reply STOP to opt out.

Send no more than one reminder unless the guest replies or asks for help.

### 3. Change-of-stay balance due

> Rose City Stays: Hi [First Name], your revised stay at [Property] is [Check-in]–[Check-out]. The updated balance is $[Amount]. Complete it securely here: [Payment Link]. We will finalize the change after payment. Reply STOP to opt out.

### 4. Change-of-stay credit or refund

> Rose City Stays: Hi [First Name], your revised stay at [Property] is confirmed for [Check-in]–[Check-out]. Your [credit/refund] of $[Amount] is being processed. We will send confirmation when complete. Reply STOP to opt out.

### 5. Direct reservation confirmation

> Rose City Stays: Your stay at [Property] is confirmed for [Check-in]–[Check-out]. Confirmation #[Reservation Number]. Arrival details will be shared before check-in. Reply STOP to opt out.

### 6. Security-deposit hold notice

> Rose City Stays: A temporary authorization hold of $[Amount] will be placed on the card for your [Property] stay. This is not a charge unless permitted by the rental terms. Reply STOP to opt out.

Only send this if the deposit authorization was actually created successfully.

### 7. Pre-arrival reminder

> Rose City Stays: Hi [First Name], we look forward to welcoming you to [Property] on [Check-in]. Please review your secure arrival details and house rules here: [Secure Link]. Reply STOP to opt out.

### 8. Guest-count and exterior-camera reminder

> Rose City Stays: For [Property], please make sure the reservation reflects the full overnight guest count. Exterior cameras are used for property security and guest-count verification, as disclosed in the house rules: [Secure Link]. Reply STOP to opt out.

### 9. Review request

> Rose City Stays: Thank you for staying at [Property], [First Name]. We would appreciate a quick review of your experience: [Review Link]. Reply STOP to opt out.

### 10. Returning-guest offer

> Rose City Stays: Welcome back, [First Name]. Save [Discount]% on a future direct stay with code [Code] by [Expiration Date]: [Booking Link]. Reply STOP to opt out.

Send this only to contacts with a separate marketing opt-in. Avoid sending the same promotion repeatedly to the entire database.

## Implementation plan after choosing a provider

1. Register a dedicated Rose City Stays number and complete A2P 10DLC registration.
2. Add the provider’s keys as protected server settings, never in browser code.
3. Connect the site’s existing direct-booking SMS-consent record to sending safeguards. Add a second consent field for marketing campaigns.
4. Add reusable templates inside the admin area with merge fields for guest name, property, dates, amount, and secure links.
5. Create a sent-message log with provider message ID, status, template name, booking ID, time, and opt-out status. Do not store message content containing sensitive information.
6. Add provider delivery and inbound-reply webhooks. STOP requests must immediately suppress future automated messages.
7. Start with three approved transactional templates: payment link, change-payment link, and reservation confirmation. Add pre-arrival and review templates after delivery results are reviewed.

## Current reservation-change price control

The admin **Move or change stay** panel now includes an **Owner price adjustment ($)** field and an optional reason.

- Enter a **positive** adjustment, such as `75`, to charge $75 more than the live Hostaway quote.
- Enter a **negative** adjustment, such as `-50`, to give a $50 credit off the live quote.
- The screen shows the live Hostaway total, adjustment, final revised total, original payment credit, and the exact remaining balance or refund amount before any change is made.
- The final revised total is saved in the reservation-change ledger, sent to Hostaway, and used for the Stripe payment link or refund calculation.
- A change that creates an additional balance still does **not** modify the original reservation until Stripe confirms the payment.

## References

[1]: https://www.twilio.com/en-us/sms/pricing/us "Twilio US SMS pricing"
[2]: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc "Twilio A2P 10DLC compliance"
[3]: https://telnyx.com/pricing/messaging "Telnyx SMS API pricing"
[4]: https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges "Telnyx 10DLC fees and charges"
