Use a **Hostaway post-checkout message automation** linking to the existing website `/leave-a-review` page. This keeps post-booking communication in Hostaway; `/reviews` is the public display page, not the submission destination. If a Google review link is later supplied, it can be offered as an optional second destination in the same message. No new website review feature is needed based on the confirmed existing pages.

## Documented route and filters

Hostaway’s current route is **Dashboard → Inbox → Automations → Create new +**. The setup guide supports these settings: [1]

- **Event Trigger:** `Guest Departure (check-out)`, documented for messages during or after checkout.
- **Channels:** Select one or multiple specific reservation channels rather than all channels. The automation overview explicitly names `Website`, `Hostaway Direct`, and `WordPress` as channels with an HTML editor. For website-direct guests, select the actual website-source channel recorded on those reservations; include `Hostaway Direct` if manual direct reservations should also receive the request. Select `WordPress` only if it is an actual reservation source in use. Leave Airbnb, every Vrbo source—including Vrbo iCal—and other third-party channels unselected. This is a positive channel allowlist, not a documented “not Airbnb/Vrbo” exclusion switch. The public setup guide does not reproduce the complete channel dropdown, so it does not settle the exact website label shown in this account. [1] [2]
- **Send automation for:** `Guest stays` is supported and is the default; `Owner stays` and combined guest/owner stays are separate options. Use guest stays for review requests. [1]
- **Listings:** Select the intended properties. **Apply listing Timezone** is also documented. [1]
- **Delivery:** The setup supports an email subject and a `Send it by SMS` option. The direct-source channels above support HTML message styling. An email request is the suggested route; retain the guest’s personal email address in the reservation for post-checkout delivery. [1] [2]

**Manual direct reservations can be included.** Hostaway defines reservations created directly in its Calendar or Reservations area as **Hostaway Direct reservations**. Combined with its channel-targeted automation support, this supports including manual guest reservations by selecting `Hostaway Direct`. It is not a separate “manual reservation” checkbox. If this website’s bookings also arrive under `Hostaway Direct`, that channel alone will not distinguish website bookings from manual bookings. [1] [2] [3]

## Recommended delay and safeguards

**Recommendation, not a Hostaway requirement:** send one polite review request **24 hours after checkout**, with listing timezone applied and SMS off for an email-first approach. Hostaway permits minutes, hours, or days before/after an event, up to 60 days; it does not prescribe a review-request delay in these guides. [1]

**Recommendation:** leave `Always trigger` off for this routine request and inspect scheduled messages before enabling a new automation. Hostaway documents that new automations can also generate messages for existing/past reservations when timing and conditions qualify. A reservation arriving after checkout will not send via `Always trigger`, even when enabled. [1] [2]

Verified November 24, 2026. Official article update dates: setup October 20, 2026; overview September 24, 2026; manual reservations November 12, 2026. Research only; no account interaction or configuration performed. Author: Manus AI.

## References

[1]: https://support.hostaway.com/hc/en-us/articles/50066767703195-Inbox-Set-Up-Message-Automations "Hostaway Inbox: Set Up Message Automations"
[2]: https://support.hostaway.com/hc/en-us/articles/360002563794-Inbox-Message-Automations "Hostaway Inbox: Message Automations"
[3]: https://support.hostaway.com/hc/en-us/articles/360006091134-Reservations-Create-a-Manual-Direct-Reservation "Hostaway Reservations: Create a Manual Direct Reservation"
