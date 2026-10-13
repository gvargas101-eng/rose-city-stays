# STR distribution and direct-booking revenue management — Rose City Stays

**Operating decision:** manage the 11-property Tyler portfolio to **net contribution per available night**, not headline ADR or gross bookings. Keep Airbnb and Vrbo as discovery and demand channels, while making the Hostaway-connected site a credible, low-friction option for guests who arrive there independently. Do not use OTA messages, listings, cancellations, or payment workarounds to divert OTA-originated guests.

## 1. Make net ADR the pricing control

**Evidence.** Airbnb says most hosts on its single-fee model pay a 15.5% host service fee (typically 14–16% for the remainder), and that the model is mandatory for most property-management-software-connected hosts. The fee is deducted from host payout and applies to the nightly price plus host fees, excluding taxes. Hostaway makes a crucial implementation distinction: a channel markup applies only to the base nightly rate, whereas channel commissions are deducted from the full booking value. [1] [2]

**Recommendation.** Use the Hostaway calendar rate as the **direct-rate master** only after documenting the actual cost stack for each channel. Exclude taxes and refundable deposits from revenue. For every completed, cancelled, and refunded reservation, calculate:

```text
Net booking revenue (before stay operating costs)
= accommodation revenue + retained mandatory fees + retained add-ons
  – OTA/channel fee – booking-engine fee absorbed by host
  – payment-processing fee – refunds/chargebacks/guest credits

Net ADR = net booking revenue / occupied nights
Net RevPAN = net booking revenue / available nights
```

Retain cleaning as revenue only if Rose City also reports the linked cleaning cost; otherwise show it separately so an elevated cleaning fee does not make a channel appear more profitable. Maintain two views: **net booking revenue** (above) for distribution decisions and **net contribution** after cleaning, laundry, consumables, guest acquisition, and any owner/management split for profitability decisions.

For each property, build a reservation-level rate calculator rather than applying a portfolio-wide markup. Let `n` be nights, `F` all taxable/non-tax fees subject to the channel fee, `c` the verified channel fee rate, and `N` the desired net booking revenue before variable stay costs. When only `c` is deducted from both rent and `F`, the required Airbnb nightly rate is:

```text
nightly rate = [N / (1 – c) – F] / n
```

This makes visible why simply marking up the nightly rate can under-recover commission on cleaning or other fees. Reconcile the calculator to sampled Airbnb and Vrbo payouts monthly; use actual contractual/payment data for Vrbo rather than assuming a fee percentage.

**Control:** retain a per-listing/channel cost card: fee model and effective date, fee base, payment cost, refund treatment, tax treatment, direct-acquisition cost, and the source of truth. It must be reviewed before changing the Hostaway markup. This is particularly important for Airbnb because service-fee structures can change; Hostaway’s own guidance says its suggested markup depends on the prior pricing strategy. [2]

## 2. Parity means consistent guest value and controlled exceptions—not identical base rates

**Evidence.** HSMAI distribution executives identify rate/content parity and leakage as persistent issues; their practical controls include dynamic rather than static rates, test bookings/rate shops to locate leakage, and limiting or terminating a leaking distributor. They also recommend tracking content changes across channels. [3] Vrbo states that its displayed total includes required fees, including its traveler service fee, and that hosts cannot waive or reduce that service fee. [4]

**Recommendation.** Set a parity standard at the **same stay, same guest count, same refundable terms, same inclusions, and tax treatment**. Compare the final checkout total—not just a nightly rate—on the direct site, Airbnb, and Vrbo. Because Airbnb’s PMS host fee and Vrbo’s traveler fee are presented differently, identical base rates can produce different guest totals and different net proceeds.

Adopt the following rules:

* **Default:** keep comparable OTA and direct checkout totals within a manager-defined small tolerance after normal rounding, with the direct site allowed a modest, plainly disclosed advantage only when it is funded by a lower direct cost and measured not to impair conversion. Do not publish a blanket public claim that direct is “always cheapest” until daily total-price rate shops support it.
* **Value parity:** align photos, title, capacity, bed/bath count, amenities, check-in rules, deposit/fee disclosures, and cancellation terms. A cheaper direct rate with worse cancellation terms is not a clean comparison.
* **Exception log:** document a date-specific exception (e.g., mobile promotion, length-of-stay offer, corporate negotiated rate, last-minute orphan-night rate) with owner, start/end date, channel, expected net outcome, and reversal date. Never leave a manual channel override without expiry.
* **Daily automated/weekly human shop:** select at least two properties weekly in low demand and all 11 before high-demand dates; compare a 2-night weekday, 2-night weekend, 7-night, and 28-night path. Record direct/Airbnb/Vrbo final total, cancellation terms, availability, content mismatch, and repair owner. Test-book only where permitted and cancel promptly; prefer normal public checkout views.

Hostaway supports listing-specific and bulk markups for Airbnb, Vrbo, and the booking engine, including negative markups, but this is a distribution lever, not a substitute for a payout model. [2] Use one source calendar and a named approver for price, fee, and restriction changes; after any bulk update, spot-check one listing per channel before applying it across the portfolio.

## 3. Configure fees and markups to preserve conversion and transparency

**Evidence.** Hostaway’s U.S./Stripe booking website applies a 1.8% booking-engine/guest-service fee to base rate plus fees, excluding taxes. It may be borne by guest (default) or host; its reporting distinguishes this from payment-processing fees. [5] On Airbnb, mandatory guest charges must be disclosed in the appropriate pricing fields (or nightly price if no field exists), and off-platform payment for reservation fees is prohibited except in limited stated cases. [6] Vrbo similarly requires mandatory fees to be entered through Vrbo or the connectivity provider for accurate upfront pricing. [4]

**Recommendation.** Use this price architecture:

1. **Calendar master:** demand-based base nightly rate by property/date, with minimum/maximum length-of-stay and gap-night rules. Do not optimize to occupancy alone. Beyond Pricing notes that ADR, occupancy, RevPAN, and booking window should be read together; its STR guidance also treats channel distribution and restrictions as revenue-management decisions, not just nightly price changes. [7]
2. **Hostaway channel layer:** calculate and set a separate Airbnb and Vrbo nightly markup only after the reservation-level target-net model. Recheck costs whenever fee configuration or direct fee pass-through changes. Put true mandatory expenses in the proper supported fee fields; do not relabel fees to conceal them.
3. **Direct checkout:** begin with transparent, minimal mandatory fees. For U.S. Stripe listings, test the 1.8% Hostaway booking-engine fee as guest-paid versus host-absorbed on comparable low-demand weeks, while holding the all-in price and cancellation terms intelligible. The decision criterion is **net direct RevPAN and checkout completion**, not the fee recovered. Display the full price breakdown before payment in either treatment.
4. **Fees versus nightly rate:** avoid a low advertised nightly rate with high fixed fees, especially for 1–2-night stays. For longer stays, cap or explain fixed cleaning/administrative charges and report them separately by stay length. Any required pet, extra-guest, or other charge must be a configured disclosure, not a post-booking surprise.
5. **Corporate/direct contracts:** price negotiated corporate stays as a documented fenced rate (eligible company, booking path, length/stay dates, cancellation and payment terms), rather than an undisclosed discount that leaks into public OTA shopping.

Hostaway’s booking website checkout can show guest details, payment details, house rules, cancellation policy, optional direct-channel fees, price breakdown, and a discount-code field. Use those fields to make the all-in total and conditions reviewable before the payment step. [8]

## 4. Improve direct conversion without poaching OTA demand

**Evidence.** Hostaway’s booking website can take instant bookings, inquiries, or both; it syncs with the Hostaway calendar, supports amenities/extras and custom pages, and can be embedded on an external site. [9] Its checkout exposes cancellation policy, rules, price breakdown, optional fees, and discount-code entry. [8]

**Recommendation.** Use direct conversion controls that reduce uncertainty rather than indiscriminately discounting:

* Put date/guest search and “Book direct” above the fold on the branded site; send paid, social, email, Google Business Profile, and returning-guest traffic to the relevant property or availability page, not a generic homepage.
* Use **instant book** for qualifying dates/property rules where operationally safe. If a reservation requires review, clearly label it an inquiry/request and measure response time to a final decision; an ambiguous “book” button that merely creates a lead creates avoidable abandonment.
* Audit the first screen, search results, and checkout on mobile monthly: correct minimum price for selected dates, availability, photos, beds, workspace/Wi-Fi and parking attributes relevant to corporate guests, total price, cancellation terms, house rules, and payment error path.
* Use a unique, time-bound code only for direct-owned audiences (past direct guests who can lawfully be contacted, employer partners, or campaign landing pages). Give the code an expiry, booking window, stay window, usage cap, and campaign ID. It is a measurement tool, not a standing public discount.
* Run one controlled change at a time for at least a meaningful number of eligible search sessions: e.g., guest-paid versus host-absorbed 1.8% fee, a simplified fee display, or instant-book versus request. Keep price and traffic source comparable, then judge net direct revenue per eligible session and cancellation-adjusted net ADR—not only gross conversion.

Do **not** put a direct-booking link, email, phone number, or “book next time direct” offer into Airbnb or Vrbo pre-booking messages, listing copy, or a cancellation/rebook workflow. Airbnb prohibits moving current, future, or repeat bookings off platform, including links and discounts to book off-platform; it can suspend or deactivate accounts for serious/repeated violations. [6] Vrbo says messages offering a personal website, alternative payment, or pre-booking contact details may be blocked, and repeated violations may suspend a listing. [10] After stays, treat any marketing to OTA guest data as a policy/privacy review item—not an assumed right—and do not condition service, reviews, or access on an external booking/account.

## 5. Align cancellation policies by stay type and demand window

**Evidence.** Airbnb permits distinct policies for short stays (27 or fewer nights) and monthly stays (28+ nights). Its standard short-stay options include Flexible, Moderate, Limited, and Firm; all include a 24-hour full-refund period when booked at least seven days before check-in. The Limited policy provides a full refund through 14 days, 50% from 7–14 days, and no rent refund below seven days. Airbnb may override a policy in specified disruption/refund cases. [11] Vrbo permits one policy per listing, seasonal policies by check-in date, and gives a Relaxed option with 100% refund through 14 days and 50% from 7–14 days; policies can be changed but existing reservations retain the prior policy. [12]

**Recommendation.** Subject to each listing’s available settings and the exact booking path, start with a comparable public short-stay policy: **Airbnb Limited / Vrbo Relaxed / direct site mirror**. This produces the same core 14-day full-refund and 7–14-day 50% refund windows, then retains rent inside seven days. Present it in plain English, with the property time zone, payment timing, fee treatment, and any legally required exceptions. Do not state “non-refundable” without the policy’s actual exceptions.

For high-demand dates, use Vrbo’s seasonal policy option and corresponding direct/OTA rules only when the guest-visible policy is explicit and the expected cancellation risk is documented. Airbnb policy availability and override rules must be checked at the listing/account level before mirroring a stricter policy. For 28+ night corporate stays, use a separately reviewed direct agreement with payment schedule, notice, early-termination, extension, and damage terms; align it as closely as permitted to Airbnb’s monthly policy, but do not falsely claim the terms match. [11] [12]

Measure cancellation rate, refunded dollars per booked dollar, days-to-cancel, rebook rate of cancelled nights, and final net ADR by policy. A stricter policy is successful only if its lower cancellation loss/rebook risk outweighs any deterioration in booking conversion or achieved net RevPAN.

## 6. Weekly scorecard, ownership, and risk triggers

**Portfolio scorecard—property × channel × stay-length band × booking window:**

| Measure | Definition / operating use |
|---|---|
| Gross ADR and **net ADR** | Compare price realization to payout after channel costs; investigate material channel spread. |
| **Net RevPAN** | Net booking revenue ÷ available nights; primary channel/rate decision metric. |
| Occupancy, booking window, length of stay | Diagnose whether a rate/restriction fills demand too early or leaves dates unbooked. |
| Direct search-to-book conversion | Confirmed direct bookings ÷ unique sessions that search availability; report traffic source separately. |
| Checkout completion | Confirmed direct bookings ÷ checkout starts; flag payment, fee, or policy friction. |
| Direct net revenue per eligible session | Net direct booking revenue ÷ eligible direct search sessions; use for conversion tests. |
| Cancellation/refund/rebook | Reservations cancelled, refunds, and nights rebooked after cancellation, segmented by policy/channel. |
| All-in parity accuracy | Percent of rate-shop checks within the approved tolerance and with matching content/policy. |
| Channel-mix quality | Share of occupied nights, net revenue, and net contribution by direct/Airbnb/Vrbo—never booking count alone. |
| Conflict/compliance incidents | Off-platform-message blocks/warnings, unapproved payment requests, content/fee disclosure errors, and remediation time. |

**Cadence and triggers.** The revenue owner reviews pickup, net ADR, restrictions, and open parity exceptions weekly; the distribution owner audits content/fees/policy mapping monthly and after every Hostaway or OTA change. Trigger a same-day review when (1) price/availability fails to sync, (2) an all-in shop shows a material unexplained disparity, (3) an Airbnb/Vrbo policy warning occurs, (4) a direct checkout payment or conversion drop persists after sufficient eligible sessions, or (5) direct cost/payout no longer reconciles to Hostaway/Stripe reports. Freeze further bulk markup changes until the issue is explained.

**Risk posture.** The highest avoidable risks are optimizing gross ADR while losing net revenue, recovering a channel fee with a base-rate markup that ignores fee commissions, hidden or mismapped mandatory charges, a direct fee that damages checkout completion, inconsistency between cancellation disclosures, calendar/rate sync failures, and OTA-originated guest diversion. The controls above prioritize verified payout economics, transparent all-in pricing, and policy-compliant demand capture over unsupported claims of direct-booking uplift.

## References

[1]: https://www.airbnb.com/help/article/1857 "Airbnb service fees" (accessed 2026-09-30)
[2]: https://support.hostaway.com/hc/en-us/articles/360002562914-Listings-Set-Up-a-Markup-Percentage "Listings: Set Up a Markup Percentage" (updated 2026-04-28; accessed 2026-09-30)
[3]: https://americas.hsmai.org/insight/content-and-rate-parity-best-practices-from-global-distribution-executives/ "Content and Rate Parity Best Practices from Global Distribution Executives" (accessed 2026-09-30)
[4]: https://help.vrbo.com/articles/what-is-the-service-fee "About Vrbo's service fee" (accessed 2026-09-30)
[5]: https://support.hostaway.com/hc/en-us/articles/31291112769307-Booking-Website-Booking-Engine-Fee "Booking Website: Booking Engine Fee" (updated 2026-09-01; accessed 2026-09-30)
[6]: https://www.airbnb.com/help/article/2799 "Off-Platform and Fee Transparency Policy" (accessed 2026-09-30)
[7]: https://beyondpricing.com/blog/revenue-management-for-vacation-rentals-the-guide "Revenue Management for Vacation Rentals: The Guide" (accessed 2026-09-30)
[8]: https://support.hostaway.com/hc/en-us/articles/48213177775387-Booking-Website-Search-Bar-and-Checkout-Settings "Booking Website: Search Bar and Checkout Settings" (updated 2026; accessed 2026-09-30)
[9]: https://support.hostaway.com/hc/en-us/articles/4409887050011-Booking-Website-Overview "Booking Website: Overview" (updated 2026; accessed 2026-09-30)
[10]: https://help.vrbo.com/articles/About-offline-booking "About off-platform booking" (accessed 2026-09-30)
[11]: https://www.airbnb.com/help/article/475 "Cancellation policies for your home" (accessed 2026-09-30)
[12]: https://help.vrbo.com/articles/what-are-the-cancellation-policy-options "About cancellation policy options" (accessed 2026-09-30)
