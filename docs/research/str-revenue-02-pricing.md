# STR dynamic-pricing operating memo — Rose City Stays (Tyler, Texas)

**Decision:** Treat dynamic pricing as a controlled, property-specific revenue process—not as a rule to follow the lowest visible competitor. For Rose City Stays’ 11 homes, use a stable annual base price for each home, automated daily price recommendations within deliberately set floors and ceilings, and a twice-weekly exception review. Change the *base* only after pace, quality, and channel data support it.

## What the evidence supports

A dynamic-pricing base price is the **average nightly rate across the year**, not a peak rate or a floor. The pricing engine applies seasonality, demand, and market adjustments to that starting point. PriceLabs also advises reviewing a market-driven base against future prices and changing a base in modest 5–10% steps rather than making repeated large moves. [1] Beyond likewise defines the base as an annual average and applies seasonal, weekday, availability, and event factors above or below it. [4]

> **Operating implication:** Rose City Stays should have **one base price per home**, never one Tyler-wide base. A downtown corporate-friendly 1-bedroom, a family 3-bedroom, and a premium amenity home can share demand data, but they should not inherit each other’s rate position.

A useful base rate has to reflect the home’s own value and realized performance. PriceLabs’ published approach considers occupancy, achieved ADR, recent pickup, reviews, amenities, property type, bathrooms, cleaning fee, and platform trust signals; it compares total guest price rather than headline nightly rate alone. [1] Beyond similarly cautions that amenities, reviews, and renovations make STRs materially different even when bedroom counts match. It specifically warns that copying nearby competitors assumes they are priced correctly. [5]

> **Operating implication:** Build the base from (1) the home’s trailing achieved ADR and occupancy for comparable dates, (2) a quality-adjusted local comparison set, and (3) the portfolio’s desired guest segment. Normalize comparisons to the **guest’s all-in stay price** and separately evaluate the **net revenue after channel/payment cost**. Do not raise or cut a base simply because another listing changes a displayed nightly price.

Future demand should supplement, not replace, historical seasonality. Specialist STR guidance identifies booking pace, search activity, lead-time shifts, confirmed events, and forward market occupancy as forward-looking signals. It distinguishes demand from current occupancy: a lightly booked date can still have strong future demand if guests are actively searching at that point in the booking window. [3] HSMAI likewise frames date-specific events and recurring attractions as demand indicators that should change the forecast, while negative demand drivers also matter. [6]

> **Operating implication:** Maintain a 90-day forward calendar that marks confirmed events, school/holiday patterns, and corporate demand dates **only after a named primary source or credible organizer/venue source is recorded**. This memo makes no claim about Tyler-specific event demand or local rate levels; those require separately verified market data.

Price guardrails are not optional. PriceLabs defines the minimum as the lowest rate the tool will recommend and the maximum as the cap on recommendations, subject to intentional date-specific overrides. Its unconfigured “safety” levels (30% below base and 10× base) are platform defaults, not evidence of an economically sound floor or ceiling for an individual home. [2] Beyond also notes that an excessive minimum can suppress low-demand and last-minute bookings. [4]

> **Operating implication:** Set floors and ceilings from Rose City Stays’ economics and positioning, then audit every override. Do **not** adopt a platform’s default 30%-below-base minimum as a portfolio policy.

## Operating rules for 11 homes

### 1. Establish a clean rate architecture

| Component | Rule for Rose City Stays | Evidence / rationale |
|---|---|---|
| **Base price** | Set one annual-average nightly base per home. For established homes, start from achieved booking rates on comparable dates, adjusted for material changes to the home, reviews, fees, or guest experience. For a new or re-launched home, use closely comparable local homes as a provisional anchor, then review after sufficient live booking data. | Annual-average base, not peak/floor: [1] [4]. Property-specific value matters: [5]. |
| **Floor** | Set a documented **minimum acceptable net nightly contribution**, then translate it to each OTA’s displayed rate after channel cost. Test separately for 1-night, short-stay, and corporate/extended-stay economics when cleaning or turnover costs differ. The dynamic minimum must not fall below the approved displayed-rate equivalent without a date-specific, logged exception. | A pricing minimum is a hard recommendation floor; tools can otherwise go unexpectedly low. [1] [2] |
| **Ceiling** | Set a high but intentional ceiling by home and review it before event/holiday periods. It should prevent a data/sync error or implausible guest price, not mechanically cap a genuinely compressed date. Any event ceiling/floor override must carry an expiry date. | Maximum limits recommended prices; fixed overrides may supersede it. [2] |
| **Fees and total price** | Compare all-in guest price: nightly rate, cleaning fee, required fees, and taxes shown to the guest. Keep a separate net-rate view for commissions/payment cost. Never bury a rate reduction in a higher mandatory fee. | Market-driven comparison including cleaning fee and fee model: [1]; additional fees affect booking response: [4]. |
| **Distribution** | Make the pricing engine/PMS the system of record. Synchronize that source to the direct site and OTAs. Audit custom OTA date prices weekly, because Airbnb custom prices override default, Smart Pricing, weekend, and long-term settings. [8] | Avoids silent channel conflicts and stale parity. |

**Floor worksheet (internal control):** for each home and stay pattern, record the displayed nightly floor, estimated OTA/direct distribution cost, variable stay cost allocated per night, and resulting net contribution. The exact dollar floor is a management decision, not a figure supplied by a pricing platform. Reapprove after a material cost, fee, furnishing, or channel-cost change.

### 2. Build comparison sets for decisions, not a rate-following robot

Create a **primary comp set per home** and a smaller manual rate-shop list. PriceLabs says its data-driven setup aims for at least 30 listings in a comp set and filters by category, bedroom count, and geography; its comp-set logic also removes outliers. [1] For Rose City Stays, the data-tool set can be broad enough for statistical signal, while the manual list should be small enough to inspect for real guest value.

Include homes that match, as closely as possible:

- micro-location and demand purpose (hospital/medical, corporate, family, leisure, relocation);
- entire-home type, bedrooms, bathrooms, sleeping capacity, parking, pet policy, workspace, outdoor space, and material amenities;
- quality/condition, review strength, cancellation terms, minimum-stay rules, and all-in fee structure; and
- active, bookable inventory for the same dates and guest segment.

Exclude a visually cheap listing until it is checked for absent amenities, weak reviews, fee loading, a different capacity, or an uncompetitive restriction. HSMAI’s sequence is especially relevant: first compare product/strengths and distribution processes, then compare **rate and value**. A poor competitive match produces a poor price-value position. [6]

**Rule against rate races:** a competitor’s lower displayed price is a **diagnostic**, not a trigger. Do not auto-match it. First verify at least two independent facts: (a) Rose City Stays’ pace is behind its comparable own-history/market pace and (b) the price gap remains after all-in fee, availability, amenity, and restriction comparison. If not, hold the rate and investigate listing conversion, channel visibility, review issue, or restriction friction. This follows Beyond’s warning against copying competition and HSMAI’s rate-*value* approach. [5] [6]

### 3. Use a booking-curve control loop

Build booking curves by **home type and date class** (weekday/weekend, normal/event, short-stay/corporate) rather than blending all 11 homes into one curve. With a small portfolio, use rolling 12-month history and pool only genuinely similar homes. At 90, 60, 30, 14, and 7 days before arrival, record on-books occupancy, ADR, pickup since the prior check, cancellations, and median lead time.

| Condition at the relevant lead-time checkpoint | Recommended action | Do not do |
|---|---|---|
| Pace is ahead of the comparable curve or market benchmark; search/event signal is also strong | Raise **unbooked** dates in a bounded step, protect the floor, and assess whether a high-demand minimum-stay rule protects total revenue. Recheck conversion and pickup. | Raise prices on confirmed reservations or assume 100% occupancy is automatically optimal. A very fast fill can mean the prior price was too low. [4] |
| Pace is close to curve and net ADR/RevPAR are on plan | Hold the base and let daily dynamic factors work. | Tinker because a single competitor changed price. |
| Pace is behind, with normal lead-time still remaining | Diagnose availability, listing health, price-value, fees, minimum stay, and channel mapping. Test one reversible action: modest price reduction, a targeted direct/OTA offer, or a restriction change. Set an expiry and measure pickup. | Broad, permanent base cut across the portfolio. |
| Pace is behind late in the normal window and forward demand is weak | Use the preapproved floor, targeted last-minute action, and gap-night/minimum-stay adjustment. Protect the economics of a one-night booking. | Discount below the floor or use a discount while a date-specific event rule remains active by mistake. |
| Confirmed event or booking pace accelerates early | Add an event rule with a higher floor and a review date; preserve enough availability to observe pickup before restricting too aggressively. | Wait until the final week to respond. Forward-signal guidance favors action while there is still 30–60 days of decision time. [3] |

The **5–10% range** is a controlled base-price adjustment convention from the specialist providers, not a rule for every date. Use smaller daily-rate tests where possible; reserve a base change for a persistent pace mismatch. PriceLabs advises waiting after base changes so the model can recalibrate, and Beyond recommends reviewing booking pace at least biweekly. [1] [4]

### 4. Separate corporate/extended stays from generic discounting

For corporate and direct-booking demand, publish qualified weekly/monthly or negotiated rate plans only when their **net contribution, cleaning/turnover load, cancellation risk, and displacement of higher-rated transient nights** are understood. Price the rate plan from the same home-level base and floors, not as a blanket portfolio discount. Track its ADR, length of stay, booking lead time, cancellation rate, channel cost, and displaced peak nights separately. This prevents an apparently high-occupancy corporate booking from hiding a lower net RevPAR outcome.

### 5. Create override discipline and audit trail

Date-specific overrides are useful for verified events, repairs, listing relaunches, data anomalies, or a deliberate campaign. But every override should have: home/date range; system-recommended price; final price/floor/ceiling or restriction; reason and evidence; owner; timestamp; expiry; and expected metric (pickup, conversion, ADR, or gap-night fill). Review the outcome after the date passes.

HSMAI’s expert guidance recommends explicit override criteria, limits on frequency and magnitude, documentation, and measurement of override impact. It offers an 80:20 no-override:override rule of thumb in normal times and says sustained high override use can signal a configuration issue. [7] Treat that 80:20 figure as a **governance alert**, not a universal portfolio target: event-heavy periods and new homes may legitimately require more intervention.

## Measurement dashboard and decision cadence

Use a home-level dashboard plus an 11-home roll-up. Define metrics consistently and do not mix tax or pass-through cleaning revenue into lodging ADR.

| Metric | Definition / cut | Decision use |
|---|---|---|
| **Occupancy** | Sold nights ÷ sellable nights, with owner blocks and maintenance blocks separately tagged. | Pace and availability context; never read alone. |
| **ADR** | Net lodging revenue ÷ sold nights, reported by direct, Airbnb, other OTA, and corporate segment. | Shows rate realization after discount strategy. |
| **Net RevPAR** | Net lodging revenue after channel/payment costs ÷ sellable nights. Label it clearly as a portfolio operating metric. | Primary cross-channel comparison; avoids favoring a high-commission booking just because gross ADR is high. |
| **Pickup / pace variance** | Net new booked nights and net new lodging revenue since last review; compare on-books position at each lead-time checkpoint with own comparable history and a quality-matched market benchmark where available. | Raise, hold, or diagnose—not automatic matching. |
| **Booking window and cancellations** | Median/percentile days from booking to arrival; cancellation rate and rebook rate by segment. | Calibrates when last-minute actions should begin. |
| **Rate-value position** | All-in guest price and restriction/amenity comparison vs. approved comp set. | Ensures a perceived-value gap, not a competitor’s headline price, drives action. |
| **Floor/ceiling and override hits** | Count/rate of dates pinned at floor or ceiling; number and share of date overrides; outcome after override. | Reveals bad guardrails, event opportunities, or pricing-engine misconfiguration. |
| **Direct share and conversion** | Direct inquiries/site sessions to bookings where available; direct booking share of net revenue. | Tests whether direct value proposition improves profitable demand without an undisclosed discount race. |

**Cadence.** Run an automated daily rate sync and a short daily exception scan for arrivals, gaps, and floor/ceiling hits. Hold a twice-weekly 30-minute pricing review for the next 90 days: examine pace, pickup, cancellations, comp-set availability, confirmed events, listing/channel issues, and override expiries. Review bases biweekly for homes with a persistent pace mismatch, and monthly for stable homes. Hold a monthly portfolio review of net RevPAR, direct/OTA mix, comp-set quality, and exception rate. This cadence adopts Beyond’s at-least-biweekly pace review while retaining human control over model outputs. [4]

## Risks and controls

- **False demand signal:** A blocked calendar, unlinked OTA reservation, or stale event listing can look like demand. Tag blocks, confirm events, reconcile channel inventory daily, and never attribute pace to price until mapping is checked.
- **Rate race / margin erosion:** Automated competitor matching magnifies bad market decisions. Use the two-signal diagnostic and minimum net contribution control above; compete through demonstrable value, availability, and listing quality.
- **Overpriced ceiling or underpriced floor:** A ceiling can truncate event upside; a floor can either erase margin or prevent late pickup. Monitor hit rates and examine every recurring pattern by home/date class.
- **Channel conflict:** Airbnb custom pricing can override other pricing logic. [8] Keep one source of truth, audit manual OTA changes weekly, and preserve an override log.
- **Small-sample noise:** Eleven homes do not yield robust data for every segment. Pool only comparable homes, favor rolling history, and label decisions as tests when evidence is thin.
- **Optimization toward gross revenue:** A higher OTA ADR can still be inferior after commission, payment cost, promotions, and turnover. Make net RevPAR and net contribution decision metrics.

## References

[1]: https://help.pricelabs.co/portal/en/kb/articles/setting-base-price "PriceLabs — How to set up your base price" (accessed 2026-09-30)

[2]: https://help.pricelabs.co/portal/en/kb/articles/what-are-minimum-base-and-maximum-prices-how-to-set-them-up "PriceLabs — What are minimum, base, and maximum prices" (accessed 2026-09-30)

[3]: https://hello.pricelabs.co/blog/future-demand-vacation-rental/ "PriceLabs — What Is Future Demand and How Does It Affect Short-Term Rentals?" (updated 2026-09-03; accessed 2026-09-30)

[4]: https://support.beyondpricing.com/en_us/what-is-my-base-price-and-when-should-i-change-it-video-Hy9E8HorO "Beyond — What is my Base Price and When should I change it?" (published 2026-08-13; accessed 2026-09-30)

[5]: https://beyondpricing.com/blog/the-science-of-setting-a-base-price "Beyond — The Science of Setting a Base Price" (published 2026-07-23; accessed 2026-09-30)

[6]: https://academy.hsmai.org/wp-content/uploads/sites/11/2020/06/4-understanding-the-market-excerpt-from-hsmai-study-guide.pdf "HSMAI Foundation — Understanding the Market (study-guide excerpt)" (published 2020; accessed 2026-09-30)

[7]: https://academy.hsmai.org/dos-and-donts-of-hotel-revenue-management-systems/ "HSMAI Academy — Do’s and Don’ts of Hotel Revenue Management Systems" (published 2024-07-15; accessed 2026-09-30)

[8]: https://www.airbnb.com/help/article/474 "Airbnb Help Center — Set and customize nightly pricing" (accessed 2026-09-30)
