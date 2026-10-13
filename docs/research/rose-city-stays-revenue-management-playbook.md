# Rose City Stays Revenue-Management Playbook

**Portfolio:** 11 short-term and corporate-rental homes in Tyler, Texas  
**Prepared:** September 30, 2026  
**Author:** Manus AI

The highest-confidence opportunity is not simply raising or lowering nightly rates. It is running each home as its own **property × stay date × length-of-stay × channel** decision, then measuring the result after channel cost, cleaning turns, refunds, and service risk.

For this portfolio, the primary decision metric should be **net contribution per available sellable home-night**. It keeps three common mistakes from looking like success:

- Filling the calendar with discounted stays that leave little margin.
- Taking a long stay that blocks a more valuable sequence of nights.
- Earning a higher OTA headline rate that produces less cash after fees, refunds, and turnover cost.

Use occupancy, ADR, RevPAR/RevPAN, and gross booking revenue as diagnostics. Do not optimize any one of them in isolation. Standard lodging definitions support reading occupancy, ADR, and RevPAR together rather than treating occupancy as the goal by itself. [1] [2] [3]

## 1. Set the revenue-management standard before changing rates

Use two related measures, and do not mix taxes, refundable deposits, or pass-through charges into them.

```text
Net lodging revenue
= realized accommodation revenue
+ retained ancillary revenue
− OTA/channel commissions
− payment-processing and booking-engine costs absorbed by Rose City Stays
− refunds, credits, chargebacks, and channel-specific costs

Net contribution
= net lodging revenue
− variable cleaning and turnover labor
− laundry, supplies, and incremental utilities
− pet/extra-guest/early-late delivery cost
− service-recovery cost and other stay-specific cost

Net contribution per available home-night
= net contribution ÷ sellable available home-nights
```

A night is **sellable** only when it was intentionally open for booking. Owner stays, maintenance, legal closures, turnover holds, and unknown blocks must be coded separately. Otherwise, a blocked night can be mistaken for a revenue-management result.

### What to collect every day

Create a daily snapshot from Hostaway for each home and date. Save the on-books state before changing prices or restrictions. The minimum fields are:

- Home and listing IDs across Hostaway, PriceLabs, the direct site, Stripe, Airbnb, Vrbo, and any other channel.
- Booking date, check-in/check-out, cancellation or modification date, channel, status, guest count, and stay length.
- Nightly accommodation revenue, discounts, fees, taxes, payout, payment cost, refunds, and chargebacks.
- The rate, minimum stay, and relevant restrictions shown at the time of booking.
- A block reason for every unavailable night.
- Cleaner capacity, maintenance conflict, inspection status, and same-day-turn risk.

Without a daily on-books snapshot, you cannot calculate pickup, pace, or a reliable booking curve. HSMAI defines pickup as bookings made since the prior report; for Rose City Stays, use **net pickup**: new bookings plus extensions, less cancellations and shortened stays. [4]

## 2. Make PriceLabs, Hostaway, channels, and the website work as one revenue system

Your technology is useful only if there is one documented authority for each control.

1. **PriceLabs:** recommended or applied date-level price, minimum/maximum price, seasonality, demand, gap-night, and booking-window rules.
2. **Hostaway:** distribution layer, listing/channel mapping, fee and markup configuration, calendar status, restrictions, and reservation ledger.
3. **Airbnb, Vrbo, and other OTAs:** final guest-facing availability, total price, cancellation terms, and native payout truth.
4. **Direct website and Stripe:** direct guest-facing price, checkout completion, payment cost, refund/chargeback result, and direct funnel.
5. **Operations records:** cleaning, linen, labor, maintenance, inspections, and early/late capacity.

Document a simple precedence map for every home: **PriceLabs → Hostaway → each OTA/direct website → guest checkout**. Then verify the outcome at the guest-facing channel. A correct setting inside a tool is not proof that a guest sees the intended price or minimum stay.

This matters because custom Airbnb nightly prices can override other pricing mechanisms, and connected channels can overwrite manual restriction edits. [5] [6] Run a weekly manual-override review and require each override to have an owner, reason, start date, end date, and result.

## 3. Build a rate architecture for every home

### One annual-average base price per home

A dynamic-pricing base price is an annual-average anchor. It is not a peak rate, an event rate, or a floor. Dynamic adjustments should move around it as seasonality, demand, booking pace, and market conditions change. PriceLabs and Beyond both describe the base this way. [7] [8]

Set a distinct base price for each home. A work-ready home near medical demand, a family-sized home, and a premium amenity home should not share one Tyler-wide base simply because they are in the same city.

For each base price, use:

- The home’s achieved ADR and occupancy for comparable past stay dates.
- A small, quality-adjusted local comp set.
- Bedroom, bed, bath, capacity, parking, pet policy, workspace, Wi-Fi, outdoor space, reviews, and condition.
- The guest’s **all-in total**, not only the advertised nightly rate.
- Actual direct and OTA net proceeds.

Change a base only after repeated evidence of a pace mismatch. PriceLabs advises measured base changes rather than frequent reactions; a 5–10% adjustment is a reasonable **base-price review range**, not a daily automatic discount rule. [7]

### Floors should protect contribution, not just occupancy

For every home, channel, and stay-length band, calculate a floor from actual economics. A simplified check is:

```text
Displayed nightly floor for an N-night stay
≈ [target contribution per night + variable cost per night + net turnover cost ÷ N]
  ÷ (1 − channel/payment cost rate)
```

Use the exact payout formula for each channel. If an OTA commission applies to cleaning or other host fees, a simple nightly markup can under-recover cost. Hostaway notes that its markup applies to the base nightly rate while channel commissions may apply to more of the reservation value. [9]

Set a high but intentional ceiling as an error guardrail. Event or holiday floors and ceilings should always have an expiry date. PriceLabs’ system defaults are safety settings, not Rose City Stays economic decisions. [10]

### Stop rate matching by headline price

A competitor’s lower nightly rate is a diagnostic, not a command. First confirm:

1. Rose City Stays is behind its comparable pace for that date and home type.
2. The gap remains after comparing all-in price, cleaning fee, cancellation terms, beds, amenities, review quality, restrictions, and availability.

If those conditions do not both hold, investigate search visibility, listing quality, fees, calendar restrictions, or channel mapping before cutting price. PriceLab and Beyond guidance both caution against treating nearby displayed rates as automatically correct. [7] [8]

## 4. Use a disciplined booking-curve playbook

Review every home at **90, 60, 30, 14, and 7 days to arrival**. Compare the date to matched history: same home or substitute group, similar weekday mix, season, event status, and booking lead time.

### When pace is strong

If pickup is ahead of a matched curve, inquiries are rising, comparable supply is shrinking, or an organizer-confirmed event is approaching:

- Raise only the remaining unbooked nights in small steps.
- Remove discretionary discounts.
- Protect the contribution floor.
- Check whether a temporary stay-pattern rule is justified.
- Recheck after the next pickup window rather than overreacting.

Fast booking is often a sign that prior pricing was too low. It is not proof that every remaining night should be restricted immediately.

### When pace is behind

Diagnose before discounting:

1. Is the night actually searchable and bookable on every live channel?
2. Is the displayed all-in price competitive for the home’s value?
3. Is a minimum stay, advance notice, CTA/CTD, manual override, or calendar block suppressing eligibility?
4. Is the listing’s content, photo order, amenity data, review profile, or mobile checkout hurting conversion?
5. Is the date still outside the normal booking window for that home and channel?

If the date is still behind after that review, make **one reversible change** with a dated expiry. Examples are a small rate move, a targeted direct-owned campaign code, a gap-night release, or a length-of-stay rule change. Log the reason and outcome.

Do not make a permanent portfolio-wide base-rate cut because one home has an unbooked week.

## 5. Length of stay: protect calendar shape without hiding the listing

Length-of-stay controls should improve contribution and calendar shape, not merely increase average stay length. Cornell warns that minimum-stay rules can harm RevPAR when demand for longer stays is insufficient. Booking.com also warns that strict restrictions reduce search eligibility. [11] [12]

### Initial rule set to test, not assume

Use the following only as a 90-day pilot after floors, cleaner capacity, and channel synchronization are documented.

- **Normal dates:** Start with a two-night minimum stay if it fits your current operational setup.
- **Friday/Saturday arrivals:** Keep a two-night minimum initially. Do not impose a blanket three-night weekend minimum.
- **Three-plus-night rule:** Use only on a date pattern where your own history shows a profitable long-stay sequence and a shorter booking is likely to strand an otherwise weak shoulder night.
- **CTA/CTD:** Keep off by default. Use only for a real cleaning, maintenance, or verified high-demand sequence constraint, with an expiry.

Every restriction needs a reason, owner, start/end date, and live searchability check. Use the restriction at its source of truth, not as disconnected manual edits across channels.

### Orphan and gap-night policy

A one- to three-night gap is perishable inventory, but not every gap should become a cheap one-night stay.

1. Prevent avoidable gaps by using adjacent-stay rules where available.
2. Within **21 days**, release an exact one- to three-night orphan gap only if the booking clears that home’s length-of-stay contribution floor and cleaner capacity is available.
3. Within **7 days**, consider a one-night release only when it does not create a worse residual gap or when the remaining gap is also safely bookable.
4. Do not lower price merely because you relaxed a minimum stay. Use the demand-based rate first; add a markdown only when the date is behind pace.
5. Suspend short-gap releases when they exceed cleaner capacity unless the expected contribution justifies an approved surge-cleaning cost.

Airbnb, Vrbo, Booking.com, and PriceLabs all support variations of date-level minimum stays or dynamic gap controls. Capability is not proof of revenue benefit, so measure each rule against contribution and service outcomes. [13] [14] [15]

### Discount ladder: use it as an experiment

Do not stack broad promotions. Test one condition at a time, above the relevant floor:

- **45+ days:** On soft Sunday–Thursday dates that are below forward pace, test a 5% early-booking offer.
- **8–14 days:** On dates below pace, test either a 5% targeted markdown or a gap/minimum-stay release, not both at once.
- **0–7 days:** On an eligible orphan or shoulder date, test up to a 10% markdown if it remains above the one-night or short-stay floor.

These are test starting points, not a claim that 5% or 10% is optimal for Tyler. Track cancellation-adjusted contribution, not occupancy alone. Airbnb supports early-booking, last-minute, weekly, monthly, and rule-set controls, but the way offers combine must be verified at checkout. [16] [17]

### Long-stay and corporate pricing

Create separate rate logic for **7–13, 14–27, and 28+ night** stays. Do not use one generic “monthly discount.” A longer stay can be valuable because it lowers turnover and acquisition cost, but it can be unprofitable if it blocks a high-demand sequence.

For every long-stay offer, compare:

```text
Contribution of requested long stay
versus
forecast contribution of the nights and stay pattern it displaces
```

Fence the offer with objective conditions: stay length, eligible home, booking window, company/contract eligibility, excluded peak dates, cancellation terms, utilities, cleaning cadence, and payment schedule. For 30+ night stays, separately confirm current tax, contract, insurance, and local legal treatment. Tyler’s HOT guidance is a prompt to reconcile this carefully, not a substitute for tax advice. [18]

## 6. Improve direct revenue without damaging channel performance

Direct booking should be measured as **net contribution per eligible direct session**, not as a belief that direct is always best.

Use a weekly all-in rate shop for the same home, dates, guest count, cancellation terms, and inclusions across the direct site and active OTAs. Compare final checkout total, not only nightly rate. Hospitality distribution guidance identifies rate/content parity as a continuing control issue, while Vrbo confirms that its traveler service fee is guest-facing and not host-waivable. [19] [20]

### Direct channel controls

- Keep date/guest search prominent on property pages and on mobile.
- Track direct funnel steps: availability search, listing view, checkout start, payment completion, and confirmed booking.
- Test one change at a time: fee presentation, guest-paid versus host-absorbed direct booking cost, a direct-owned campaign code, or checkout simplification.
- Use direct codes for direct-owned audiences, such as prior direct guests or employer partners, with an expiry, stay window, usage cap, and campaign label.
- Keep photos, beds, capacity, one-gig Wi-Fi, parking, pet policy, deposit terms, house rules, cancellation policy, and total price consistent and easy to verify.

Do **not** move Airbnb or Vrbo guests to the direct site for payment, extensions, or future/repeat booking offers through OTA messages. Airbnb and Vrbo both prohibit off-platform diversion practices. [21] [22]

## 7. Manage Tyler demand as an evidence calendar, not a permanent markup

Tyler has credible year-round demand hypotheses from healthcare, higher education, major employers, civic events, and Texas Rose Horse Park activity. UT Health Tyler is a large regional acute-care facility, and official calendars document recurring Horse Park and festival dates. [23] [24] [25]

Map each property by **actual drive time** to:

- UT Health and other medical campuses.
- CHRISTUS / downtown / Rose Garden area.
- UT Tyler.
- Texas Rose Horse Park, airport, fair, and event corridors.

Then build an owner-controlled event and demand calendar with:

- Event name, venue, dates, organizer, source URL, and last verified date.
- Confirmed / recurring / watch status.
- Likely traveler type and demand zone.
- Drive-time band for each home.
- 90/60/30/14/7-day pickup, inquiry, availability, ADR, LOS, and cancellation checkpoints.

A confirmed event is a **compression-watch signal**, not automatic permission to add a premium. Only protect price or change minimum stay after Rose City Stays’ own pickup, lead-time, comparable-supply, and requested-stay data support it.

## 8. Increase profit without creating checkout friction

### Fees and extra guests

Keep the fee structure short, clear, and defensible:

- A calibrated cleaning fee by home and stay length.
- A pet fee only in homes that can be reliably reset.
- The existing extra-guest fee only after the included count, bedding, consumables, linen load, and cleaning impact are confirmed.

Your current rule—four guests included, then $10 per additional guest per night—is operationally simple. Keep it only if your data show it covers incremental cost without harming conversion or creating guest conflict. Track guest count accuracy, incremental linen/utility/supply cost, post-stay cleaning time, declared versus observed guests, refund/chargeback incidents, and value-review comments.

Avoid utility, Wi-Fi, basic-linen, administrative, and multiple nuisance fees. Expedia Group recommends clear, proportionate charges and warns that basic-amenity fees can harm perceived value. [26]

### Early check-in and late check-out

These can be high-contribution services only when operationally available. Offer them after checking same-day departure, arrival, cleaner route, maintenance, and inspection status. Set a daily capacity cap. Do not sell a time window that a cleaner or inspection process cannot support.

### Security deposits and damage

A refundable security deposit or card hold is not revenue. Treat it as a risk-control tool and measure it by avoided unrecovered loss, claims recovery, friction, and administrative cost. Use complete photo, inventory, inspection, invoice, and claim-timing workflows. Channel-native damage rules may have strict deadlines. [27] [28]

## 9. Use a practical operating cadence

### Daily: 10–15 minutes

Review arrivals within 21 days, net pickup, cancellations, changes, orphan gaps, floor/ceiling hits, sync errors, cleaner capacity, and maintenance conflicts. Correct errors and document exceptions. Do not change prices everywhere because the calendar looks quiet.

### Twice weekly: 45 minutes

Review 14/30/60/90-day pace by home and true substitute group. Check all-in guest price, restrictions, event status, comp availability, direct funnel issues, and overrides. Approve only small, reversible actions with an expiry.

### Weekly: 60 minutes

Review the 13-week forecast, cancellation/rebooking performance, OTA/direct parity, current tests, and direct mobile checkout. Rate-shop at least two homes in normal periods and all homes before major event periods.

### Monthly: 90 minutes

Reconcile Hostaway reservations to OTA payouts and Stripe. Close the stay-month scorecard: occupancy, gross ADR, realized ADR, net revenue, net contribution, LOS mix, turns, channel mix, fees, cancellations, forecast error, and review/service indicators.

### Quarterly: 2 hours

Rebase home profiles, comp sets, floors/ceilings, corporate-rate logic, long-stay controls, demand-zone assumptions, and the testing backlog. Scale only what improves contribution without harming cancellations, sync reliability, cleaner capacity, guest experience, or compliance.

## 10. The 90-day priority plan

### Days 1–14: stop revenue leakage and create control

1. Build the cross-system listing ID map and block taxonomy.
2. Establish PriceLabs/Hostaway/channel/source-of-truth precedence for each listing.
3. Create a sampled reservation-level reconciliation to Airbnb, Vrbo, Stripe, and direct booking records.
4. Build one cost card per home/channel/LOS band.
5. Audit all 11 homes at guest checkout for availability, all-in price, fees, policy, discount, and minimum-stay accuracy.
6. Create the event-demand calendar and drive-time map.
7. Start the daily snapshot and override decision log.

Do not make a broad price reset, add a blanket discount, or loosen one-night stays before these controls pass.

### Days 15–45: launch bounded tests

1. Set a home-specific base, floor, and ceiling using actual cost and payout data.
2. Pilot the two-night default and conditional short-gap release on appropriate homes.
3. Test one discount ladder condition on soft dates only.
4. Test a separate 7–13, 14–27, and 28+ night plan with peak-date protections.
5. Improve direct tracking and run a mobile/all-in checkout audit.
6. Pilot one ancillary lever at a time: pet fee calibration, extra-guest economics, or conditional early/late access.

### Days 46–90: scale evidence, not anecdotes

1. Score each test after its cancellation/refund window matures.
2. Keep rules only if they improve realized net contribution and do not worsen operations or conversion.
3. Build a 13-week forecast based on on-books, expected pickup, expected cancellations, weekday, season, event flag, and home/cohort.
4. Separate the performance of direct, Airbnb, Vrbo, corporate, and long-stay demand.
5. Remove failed overrides and restrictions instead of allowing them to accumulate.

## 11. Recommended dashboard

Use one simple dashboard with four views:

1. **Today:** exceptions, 0–21-day arrivals, cancellations, gaps, cleaner risks, and sync errors.
2. **90-day revenue calendar:** each home/date’s sellable inventory, on-books nights, pickup, pace, displayed rate, floors, restrictions, and event flag.
3. **Realized month:** gross ADR, realized ADR, net revenue, net contribution, occupancy, RevPAN, LOS, turns, channel mix, cancellations, and payout reconciliation.
4. **Learning log:** every test, hypothesis, dates, homes, baseline, action, results, service outcome, and keep/stop decision.

The dashboard should report portfolio total, each individual home, and comparable groups. A blended average must never hide a home that is discounted too heavily, restricted out of search, or failing to convert.

## 12. What I would implement first in your current stack

1. **Revenue-control dashboard:** pull reservations, calendar blocks, pricing rules, direct payments, and checkout funnel data into an owner-only view.
2. **Event-demand calendar:** maintain Tyler, Horse Park, medical/corporate, university, and Rose Festival signals with date verification and home drive-time mapping.
3. **Rate/availability QA tool:** compare direct and OTA availability, all-in total, fees, policy, and minimum stay on selected future dates; flag parity or sync issues before guests do.
4. **Contribution floor calculator:** use actual cleaner, linen, channel, payment, and refund costs to calculate approved floors by home and LOS.
5. **Restriction and experiment log:** apply every temporary rule with an owner, expiry, guardrail, and measured outcome.

The sequence matters: first make the data accurate and the guest-facing booking path reliable; then test pricing and LOS decisions; finally scale the rules that protect **realized net contribution**.

## References

[1]: https://www.costar.com/products/str-benchmark/resources/data-insights-blog/what-occupancy-rate "CoStar STR — What is an Occupancy Rate?"

[2]: https://www.costar.com/products/str-benchmark/resources/data-insights-blog/what-average-daily-rate-adr-and-how-calculate "CoStar STR — What Is Average Daily Rate (ADR) and How to Calculate It"

[3]: https://www.costar.com/products/str-benchmark/resources/data-insights-blog/what-revenue-available-room-revpar-and-how "CoStar STR — What Is Revenue per Available Room (RevPAR)?"

[4]: https://academy.hsmai.org/glossary/pick-up-or-pace-report/ "HSMAI Academy — Pick-up or Pace Report"

[5]: https://www.airbnb.com/help/article/474 "Airbnb Help Center — Set and Customize Nightly Pricing"

[6]: https://partner.booking.com/en-us/help/rates-availability/restrictions/adding-and-managing-restrictions "Booking.com Partner Hub — Adding and Managing Restrictions"

[7]: https://help.pricelabs.co/portal/en/kb/articles/setting-base-price "PriceLabs — How to Set Up Your Base Price"

[8]: https://support.beyondpricing.com/en_us/what-is-my-base-price-and-when-should-i-change-it-video-Hy9E8HorO "Beyond — What Is My Base Price and When Should I Change It?"

[9]: https://support.hostaway.com/hc/en-us/articles/360002562914-Listings-Set-Up-a-Markup-Percentage "Hostaway — Listings: Set Up a Markup Percentage"

[10]: https://help.pricelabs.co/portal/en/kb/articles/what-are-minimum-base-and-maximum-prices-how-to-set-them-up "PriceLabs — What Are Minimum, Base, and Maximum Prices?"

[11]: https://ecornell-impact.cornell.edu/the-dos-and-donts-of-length-of-stay/ "Cornell eCornell — The Dos and Don’ts of Length of Stay"

[12]: https://partner.booking.com/en-us/solutions/restrictions "Booking.com Partner Hub — Restrictions"

[13]: https://www.airbnb.com/help/article/880 "Airbnb Help Center — Set the Minimum and Maximum Nights for Your Listing"

[14]: https://help.vrbo.com/articles/How-do-I-set-a-minimum-stay-requirement "Vrbo Help — Set a Minimum and Maximum Length of Stay"

[15]: https://help.pricelabs.co/portal/en/kb/articles/understanding-min-nights "PriceLabs — Setting Dynamic Minimum Stay Restrictions"

[16]: https://www.airbnb.com/help/article/3421 "Airbnb Help Center — How Discounts Are Applied"

[17]: https://www.airbnb.com/help/article/2061 "Airbnb Help Center — How Rule-Sets Work"

[18]: https://tylertx.hdlgov.com/Home/Home/HOT "City of Tyler — Hotel Occupancy Tax Processing Center"

[19]: https://americas.hsmai.org/insight/content-and-rate-parity-best-practices-from-global-distribution-executives/ "HSMAI Americas — Content and Rate Parity Best Practices from Global Distribution Executives"

[20]: https://help.vrbo.com/articles/what-is-the-service-fee "Vrbo Help — About Vrbo’s Service Fee"

[21]: https://www.airbnb.com/help/article/2799 "Airbnb Help Center — Off-Platform and Fee Transparency Policy"

[22]: https://help.vrbo.com/articles/About-offline-booking "Vrbo Help — About Off-Platform Booking"

[23]: https://uthealtheasttexas.com/locations/tyler/ "UT Health Tyler"

[24]: https://www.texasrosehorsepark.com/calendar "Texas Rose Horse Park Event Calendar"

[25]: https://www.texasrosefestival.org/ "Texas Rose Festival"

[26]: https://partner.expediagroup.com/en-us/resources/blog/guide-vacation-rental-pricing "Expedia Group — Balancing Fees and Discounts in Your Vacation Rental Pricing"

[27]: https://help.vrbo.com/articles/How-do-damage-deposits-work "Vrbo Help — About Damage Deposits"

[28]: https://www.airbnb.com/help/article/279 "Airbnb Help Center — Host Damage Protection"
