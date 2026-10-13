# Rose City Stays — STR Length-of-Stay Revenue Management

**Portfolio:** 11 short-term and corporate-rental homes, Tyler, Texas  
**Research memo:** 30 September 2026  
**Scope:** Minimum-stay, gap-night, day-of-week, booking-window, last-minute, weekly/monthly, and cancellation/rebooking controls. This is a portfolio operating framework, **not a claim about Tyler demand or a forecast**. Market-specific thresholds should be calibrated from Rose City Stays (RCS) reservations, cleaner capacity, and competitor/market data.

## Executive view

**Evidence.** Length-of-stay (LOS) controls determine which reservation durations are accepted. They can protect shoulder nights around a high-demand period, but they can also reduce revenue when long-stay demand is insufficient; Cornell specifically cautions that MinLOS can hurt RevPAR without adequate demand ([Cornell/eCornell, 27 Mar 2013](https://ecornell-impact.cornell.edu/the-dos-and-donts-of-length-of-stay/)).

**Recommendation.** Treat LOS as a *contribution-margin and calendar-shape* decision, not an occupancy target. Use a modest two-night default as a **test hypothesis**, dynamically open exact orphan gaps, and reserve three-plus-night or arrival restrictions for dates where RCS has evidence that accepting a short stay would strand a lower-demand shoulder. A lower rate or one-night stay is rational only if its incremental, cancellation-adjusted contribution exceeds its cleaning, channel, and operational cost.

The immediate priority is a single source of truth for rates/restrictions (PMS/RMS/channel manager), followed by a controlled 90-day pilot. Avoid untested, blanket three-night minimums: Booking.com warns that more restrictions reduce search visibility and that strict three-night minimums can exclude a property from common one- and two-night searches ([Booking.com, “Restrictions”](https://partner.booking.com/en-us/solutions/restrictions), accessed 30 Sep 2026).

## What the sources establish — and the operating trade-off

| Lever | Evidence from credible sources | Occupancy / ADR / turnover / contribution-margin implication |
|---|---|---|
| **MinLOS and MaxLOS** | Airbnb allows listing minimum/maximum nights and custom minimums by **check-in day** ([Airbnb](https://www.airbnb.com/help/article/880)); Vrbo applies minimum nights based on the check-in date and supports date overrides ([Vrbo](https://help.vrbo.com/articles/How-do-I-set-a-minimum-stay-requirement)). | A longer minimum can protect an adjacent soft night and reduce cleanings per occupied night, but filters out otherwise profitable short stays. A maximum LOS can prevent a discounted long stay from consuming a high-rate period; use it only where displaced high-value demand is credible. |
| **Day-of-week / arrival controls** | Booking.com supports Min/Max LOS, LOS-from-arrival, exact stay, no-arrival/no-departure, and advance-reservation restrictions ([Booking.com](https://partner.booking.com/en-us/help/rates-availability/restrictions/adding-and-managing-restrictions)). Cornell advises especially careful use of closed-to-arrival because effects spill into later days ([Cornell/eCornell](https://ecornell-impact.cornell.edu/the-dos-and-donts-of-length-of-stay/)). | Arrival restrictions can smooth cleaner capacity and protect a stay pattern, but suppress demand more broadly than a price change. Use only for a defined operational bottleneck or a tested high-demand pattern, not as routine weekend protection. |
| **Orphan/gap nights** | Booking.com can automatically relax MinLOS and price for gap/unsold nights across selected next-3-to-60-day windows ([Booking.com dynamic rules](https://partner.booking.com/en-us/help/rates-availability/restrictions/setting-dynamic-restriction-rules)). PriceLabs supports a gap-length rule, last-minute rules, adjacent-booking controls, and group/account/listing overrides ([PriceLabs](https://help.pricelabs.co/portal/en/kb/articles/understanding-min-nights)). | Exact-gap availability converts otherwise unusable inventory. But opening a one-night stay creates a turnover and can leave a new gap; the price must cover that incremental turnover, and the rule must not undercut a profitable longer booking prematurely. |
| **Booking-window / last-minute discounting** | Airbnb supports early-bird and last-minute discounts; professional rule-sets also allow pricing, LOS, check-in/out, and booking-window rules ([Airbnb discounts](https://www.airbnb.com/help/article/3421); [Airbnb rule-sets](https://www.airbnb.com/help/article/2061)). | Early discounts improve booking certainty but can discount guests who would book anyway and expose the calendar to later cancellations. Last-minute reductions can monetize perishable availability but may reset guests’ price expectations or sell below variable cost. Apply only to dates behind pace, never as an automatic response to every vacancy. |
| **Weekly/monthly discounts** | Airbnb supports weekly (7+ nights), monthly (28+ nights), and other trip-length discounts; 10%+ weekly/monthly discounts can be displayed in search ([Airbnb](https://www.airbnb.com/help/article/1233)). | Longer stays spread cleaning and guest-acquisition costs over more nights, typically helping margin and operations. The discount must not exceed avoided turnover/channel cost plus the value of occupancy certainty, and must not displace peak dates that would sell at higher short-stay rates. |
| **Restriction and sync governance** | Booking.com says restrictions can make a property invisible to searches that do not meet them and warns that a connectivity partner can overwrite Extranet changes ([Booking.com](https://partner.booking.com/en-us/help/rates-availability/restrictions/adding-and-managing-restrictions)). PriceLabs notes that, for some integrations including Airbnb, its minimum-night settings overwrite existing channel settings ([PriceLabs](https://help.pricelabs.co/portal/en/kb/articles/understanding-min-nights)). | A technically correct rule in one channel can fail or be overwritten elsewhere. Cross-channel inconsistency causes lost demand, unexpected bookings, and potentially costly host-initiated cancellations. |

## Decision economics: use contribution, not headline ADR

**Recommendation.** Before setting a one-night exception or an LOS discount, calculate it by **channel, home, LOS, and arrival date**:

```text
Net lodging revenue = nightly charges after discounts
                    − OTA/channel commission − payment costs

Booking contribution = Net lodging revenue
                     + retained cleaning-fee revenue
                     − cleaning/laundry/restock cost
                     − incremental utilities and stay-specific supplies
                     − expected guest-resolution/refund cost

Contribution per occupied night = Booking contribution / booked nights
Contribution per available night (ContribPAR) = total booking contribution / available nights
```

Keep fixed rent, salaries, and owner distributions separate from this *short-run* acceptance decision, but reconcile to property P&L monthly. A useful price-floor calculation for an **N-night** stay is:

```text
Maximum allowable discount d = 1 − [target CM/night + variable cost/night
                                    + net turnover cost/N]
                                  / [published nightly rate × (1 − channel-cost rate)]
```

where *net turnover cost* equals cleaning/laundry/restock less any cleaning-fee revenue retained. If the result is negative, do not discount to obtain the booking; either decline it, alter the fee/rate architecture, or accept it only for a documented strategic reason. For a long stay that crosses a forecast peak, compare its full booking contribution with the **forecast contribution of displaced short stays**; do not compare ADR alone.

## Proposed 90-day RCS rulebook — explicit hypotheses to test

These are recommendations, not empirical claims. Start only after loading actual clean cost, OTA commission, utility estimates, capacity constraints, existing reservations, and cancellation history. Apply per-home exceptions for size, corporate suitability, pet/party risk, and owner blocks.

### 1) Default and day-of-week minimum stays

| Situation | Initial rule to test | Release / safeguard | Why it is testable |
|---|---|---|---|
| Normal, non-event dates | **2-night MinLOS** for all arrivals as the base profile. | A one-night booking is allowed only under the orphan/last-minute rules below and only if it clears the one-night CM floor. | Compare each home’s 2-night profile with its prior matched home × arrival-day × lead-time performance; measure ContribPAR, not occupancy alone. |
| Friday/Saturday arrivals | Retain a **2-night** minimum. Do **not** use an automatic three-night weekend rule. | Test a 3-night minimum for Friday arrival only where a Friday–Sunday pattern has historically produced enough qualified three-night demand *and* a two-night Friday booking would likely strand Sunday. Exclude major-event dates from the first test. | Compare identical arrival-DOW/lead-time cohorts; retain only if cancellation-adjusted ContribPAR improves and Sunday gap nights decline. |
| Sunday–Thursday arrivals | Keep the 2-night base; use a one-night exception only for an exact gap or at short lead time. | Do not create a blanket weekday one-night rate merely to raise occupancy; opening must meet CM floor and cleaner capacity. | Separates genuinely incremental one-night demand from bookings that would have accepted two nights. |
| No-arrival/no-departure (CTA/CTD) | **Off by default.** Use only for a documented cleaner/maintenance capacity constraint or a tested, sold-out stayover pattern. | Put an expiry date on every CTA/CTD and review within 48 hours. | Booking.com and Cornell both show these controls are available but visibility-sensitive; compare lost search exposure/pickup with operational savings. |

Define “high demand” from RCS data rather than a citywide assertion: for each home and arrival-day, flag a date only when on-books occupancy and pickup at that lead time exceed that home’s comparable-date historical percentile (for example, its 75th percentile), with a manager override logged. **Do not tighten MinLOS simply because ADR is high.** The evidence-based reason is a profitable full-stay pattern, not price alone.

### 2) Orphan/gap-night policy

1. **Prevent avoidable gaps first.** Where the technology supports it, apply an adjacent-arrival rule so a short reservation is accepted only if it abuts an existing booking/block and does not create a one- or two-night remainder. PriceLabs documents adjacent-booking controls within its dynamic minimum-stay settings ([PriceLabs](https://help.pricelabs.co/portal/en/kb/articles/understanding-min-nights)).
2. **Exact-gap release:** for a 1–3-night orphan within **21 days**, lower MinLOS to the exact gap length (not “gap minus one”) and make it bookable. For a one-night gap, price to the one-night CM floor; for a two-/three-night gap, price each night dynamically but require the whole gap initially.
3. **Late rescue:** within **7 days**, allow a one-night booking into a two- or three-night orphan only if it is adjacent to a booking or the residual night is simultaneously released and itself clears the CM floor. Do not knowingly trade one orphan for another without a measured margin benefit.
4. **Price, do not only relax:** gap availability is not an instruction to slash price. Start from the date’s demand-based price, then use a pre-set, non-stacking markdown only if the date is behind pace. Booking.com’s dynamic rules explicitly allow a price adjustment together with the restriction change ([Booking.com dynamic rules](https://partner.booking.com/en-us/help/rates-availability/restrictions/setting-dynamic-restriction-rules)).
5. **Operational cap:** suspend one-night gap releases on an arrival date when committed turnovers reach cleaner capacity, unless the incremental contribution exceeds an explicitly approved surge-cleaning cost.

### 3) Booking-window and last-minute price rules

Use a **non-stacking, date-specific ladder** as an initial experiment. Airbnb says rule-set price elements apply in a defined order and its example shows a monthly discount, rather than an early-bird discount, being selected where both qualify; discounts/promotions may also have their own combination rules ([Airbnb rule-sets](https://www.airbnb.com/help/article/2061); [Airbnb discounts](https://www.airbnb.com/help/article/3421)). Therefore, verify the guest checkout price on every channel before launch—never assume percentages stack or do not stack the same way everywhere.

| Booking lead time (DTA) | Initial pilot condition and offer | Guardrail |
|---|---|---|
| **45+ days** | On eligible Sunday–Thursday/non-peak dates that are below forward occupancy target, test a **5% early-booking discount**. | No discount on protected peak/event dates; price after all discounts must exceed the LOS-specific CM floor. Track whether these bookings cancel more often or merely replace full-price bookings. |
| **8–14 days** | If a date remains below its RCS pace target, test a **5% last-minute markdown** or open its exact gap; choose one primary treatment so the result is interpretable. | Do not apply automatically to a date already picking up at/above target. |
| **0–7 days** | If still behind pace, test a **10% markdown**, first on orphan/shoulder nights. Pair with a one-night exception only when cleaning capacity and CM floor permit. | No “race to the bottom”: lower only to the precomputed floor. Stop if the discount lowers cancellation-adjusted ContribPAR versus matched controls. |

These percentages are deliberately modest **test settings**, not a claim that they are optimal for Tyler. Assign one eligible treatment per date (early discount, last-minute discount, or LOS release) whenever possible; otherwise the portfolio will not learn which lever caused the result.

### 4) Weekly, monthly, and corporate-stay discount design

1. Create separate 7–13-night, 14–27-night, and 28+-night rate tests rather than one blunt “long stay” discount. Airbnb’s 7- and 28-night thresholds are platform-supported ([Airbnb](https://www.airbnb.com/help/article/1233)).
2. Calculate each tier’s maximum discount with the formula above. The **weekly tier** should normally reflect fewer turnovers and acquisition events; the **monthly tier** should also incorporate incremental utilities, consumables, wear, payment timing, furnishing risk, and any local legal/occupancy implications that RCS’s counsel/insurer identifies.
3. Fence longer-stay deals from forecast peaks: either cap eligible check-in dates, exclude peak nights, set a maximum LOS for the discounted rate, or price peak nights separately where the system permits. Cornell notes that MaxLOS is appropriate only with high demand and can otherwise reduce RevPAR ([Cornell/eCornell](https://ecornell-impact.cornell.edu/the-dos-and-donts-of-length-of-stay/)).
4. For corporate rentals, create a tagged rate/lead source and record extension behavior, invoicing/collection cost, damage/maintenance cost, and notice requirements. A 28-night booking is not automatically more profitable merely because cleaning turns are fewer.

## Cancellation and rebooking-risk controls

### Platform exposure (evidence)

* Under Airbnb’s policy effective **6 February 2025**, a host cancellation before check-in entitles the guest to a full refund and Airbnb may help find comparable accommodations; the host receives no payout or a reduced payout when a cancellation/reservation issue applies ([Airbnb](https://www.airbnb.com/help/article/2868)).
* Vrbo’s host-cancellation policy, accessed 30 September 2026 and stated to be in force until 14 October 2026, can charge **10%** of reservation amount more than 30 days out, **25%** within 30 days, **50%** within 48 hours, and up to **100%** at/after check-in; it also describes a USD $50 minimum where applicable, suspension, reduced ranking, and wider account consequences ([Vrbo](https://www.vrbo.com/tlp/trust-and-safety/partner-initiated-cancellation-policy)).

### RCS operating policy (recommendation)

1. **Never cancel a confirmed guest to take a higher-rate booking.** Do not unilaterally move a guest to another home. A substitute home is an option only with guest agreement and platform-compliant handling; Vrbo explicitly lists switching the guest to a different booked property as a host-cancellation example.
2. **Prevent, do not “solve,” double bookings.** Reconcile every channel calendar at least daily and immediately after a rule/rate edit; alert if a PMS/RMS restriction differs from Airbnb, Vrbo, or Booking.com. Booking.com cautions that connected-provider updates may overwrite Extranet changes ([Booking.com](https://partner.booking.com/en-us/help/rates-availability/restrictions/adding-and-managing-restrictions)).
3. **Protect the rebooking window.** For each guest cancellation, immediately release the exact dates, remove stale MinLOS/CTA restrictions, and evaluate gap/last-minute rules by the CM floor. Record whether the canceled nights rebook, at what net rate, and how many days before arrival.
4. **Separate cancellation behavior by rate/LOS cohort.** Analyze early-bird, last-minute, weekly, monthly, corporate, OTA, and direct bookings separately. Do not conclude an early-booking discount is beneficial until its cancellation-adjusted contribution beats the control cohort.
5. **Maintain a service-recovery playbook.** Keep approved alternate-cleaner, maintenance, and comparable-home contacts; document guest communication and evidence. This mitigates operational failure but does not make a host cancellation economically acceptable.

## Measurement dashboard and experiment design

### Core metrics (home, channel, and portfolio roll-up)

| Metric | Definition / decision use |
|---|---|
| **Occupancy, ADR, RevPAR** | Standard demand and rate view. Interpret with LOS and availability restrictions; high occupancy alone is not success. |
| **LOS and booking mix** | Median/mean LOS; share of 1, 2, 3–6, 7–13, 14–27, and 28+ night bookings by arrival day and channel. |
| **Turnovers per 100 occupied nights** | Arrivals (or cleanings) ÷ occupied nights × 100; pair with cleaner cost and service failures. This is the operational benefit a longer LOS must deliver. |
| **Orphan inventory** | Count and value of 1-, 2-, and 3-night gaps created, opened, booked, and still unsold; report at 21, 14, 7, and 0 DTA. |
| **Cancellation-adjusted ContribPAR** | (Net booking contribution less refunds, recovery, incremental re-cleaning, and unrecovered canceled-night cost) ÷ available nights. Primary score for LOS/discount decisions. |
| **Discount realization** | Gross markdown dollars, realized net ADR, contribution after channel cost, and share of bookings that would likely have been full price (use control cohorts). |
| **Cancellation / rebooking recovery** | Guest cancellation rate; host cancellation count (target: **zero**); rebook rate; rebooked net revenue ÷ original expected net revenue; days from cancellation to replacement. |
| **Capacity/service guardrails** | Arrivals by date versus cleaner capacity; late turns, maintenance incidents, refunds, rating impact, and owner-block conflicts. |

### Pilot mechanics

1. **Two-week audit:** map source-of-truth ownership, extract 12 months of reservations/cancellations where available, calculate channel-specific cost and cleaning inputs, and inventory existing gaps/restrictions. Verify live guest-facing checkout prices after every test.
2. **Eight-week controlled release:** use matched home × arrival-day × lead-time cohorts. Where feasible, alternate comparable non-event weeks or assign comparable homes to control/treatment; do not compare a holiday/event week with an ordinary week. Hold back at least one normal profile for comparison.
3. **Two-week review:** retain a rule only when it improves cancellation-adjusted ContribPAR **and** does not violate the per-booking CM floor, cleaner-capacity limit, or zero-host-cancellation rule. If evidence is inconclusive, extend the test; do not deploy portfolio-wide because occupancy increased.
4. **Weekly exception review:** list every 1-night opening, 3+-night restriction, CTA/CTD, rate-floor override, and canceled reservation with owner, rationale, and expiry. Remove expired controls.

## Implementation checklist

- [ ] Choose the PMS/RMS/channel manager as authoritative for restrictions; document which fields overwrite each OTA.
- [ ] Create property tags: corporate-ready, standard STR, cleaner-capacity group, peak-sensitive, and exceptional maintenance/owner-block risk.
- [ ] Load CM inputs and price floors before enabling discounts or one-night gap rules.
- [ ] Publish four profiles: base 2-night, high-demand Friday-arrival test, exact-orphan release, and last-minute rescue.
- [ ] Test each profile on real guest-facing channel calendars, including rate calculation, booking eligibility, cleaning fee, taxes, and cancellation terms.
- [ ] Start the dashboard and weekly restriction/cancellation log; review after 21, 14, 7, and 0 DTA.

## Source register (12 URLs; accessed 30 September 2026 unless noted)

1. [Cornell/eCornell — “The Dos and Don’ts of Length of Stay”](https://ecornell-impact.cornell.edu/the-dos-and-donts-of-length-of-stay/) — published 27 Mar 2013; high-demand applications and cautions.
2. [Airbnb Help — Set the minimum and maximum nights for your listing](https://www.airbnb.com/help/article/880) — official host controls and check-in-day customization.
3. [Airbnb Help — Weekly and monthly discounts for home stays](https://www.airbnb.com/help/article/1233) — official 7+/28+ discounts and search display.
4. [Airbnb Help — How discounts are applied](https://www.airbnb.com/help/article/3421) — official early-bird, last-minute, custom, and LOS options.
5. [Airbnb Help — How rule-sets work](https://www.airbnb.com/help/article/2061) — professional hosting rule-set controls and price-calculation ordering.
6. [Airbnb Help — Rebooking and refund policy for homes](https://www.airbnb.com/help/article/2868) — effective 6 Feb 2025; host-cancellation/rebooking consequences.
7. [Booking.com Partner Hub — Adding and managing restrictions](https://partner.booking.com/en-us/help/rates-availability/restrictions/adding-and-managing-restrictions) — restriction types, visibility risk, connectivity notes.
8. [Booking.com Partner Hub — Restrictions](https://partner.booking.com/en-us/solutions/restrictions) — search-visibility and short-stay demand caution.
9. [Booking.com Partner Hub — Setting up dynamic restriction rules](https://partner.booking.com/en-us/help/rates-availability/restrictions/setting-dynamic-restriction-rules) — gap/unsold-night automation and windows.
10. [PriceLabs Help Center — Setting Dynamic Minimum Stay Restrictions](https://help.pricelabs.co/portal/en/kb/articles/understanding-min-nights) — named STR specialist; dynamic, orphan, adjacent, last-minute, and integration controls.
11. [Vrbo Help — Set a minimum and maximum length of stay](https://help.vrbo.com/articles/How-do-I-set-a-minimum-stay-requirement) — official host controls and date-specific overrides.
12. [Vrbo — Host Cancellations Policy](https://www.vrbo.com/tlp/trust-and-safety/partner-initiated-cancellation-policy) — official enforcement and financial exposure.
