# Rose City Stays Production Audit

**Audit date:** October 1, 2026  
**Production site:** https://www.rosecitystays.com/

## Overall result

> **Operationally ready for live direct bookings after the repairs documented below.**

The public site, property availability display, direct checkout safeguards, Hostaway reservation synchronization, GA4 setup, policy pages, and admin operations were reviewed. No active confirmed direct booking was found without a Hostaway reservation reference in the audit window.

## Verification summary

| Area | Result | Evidence / Notes |
|---|---|---|
| Public home page | Pass | Loads correctly with 11 properties, 1 Gig Wi-Fi, 1,000+ stays, navigation, inquiry form, and policy links. |
| Property pages | Pass | Live Hostaway calendar/rate data renders on the checked property page; blocked and available dates are differentiated. |
| Direct checkout | Pass | Code path verifies payment before Hostaway reservation creation. Checkout has a Stripe webhook plus confirmation-page fallback. |
| Availability protection | Pass | Direct and manual checkout both re-check Hostaway availability immediately before payment. |
| Hostaway synchronization | Pass | Recent confirmed direct bookings have a Hostaway reservation reference. Hostaway payment-reconciliation failures are surfaced to the owner. |
| Security deposit holds | Repaired | Direct and manual checkout now use a real Stripe manual-capture authorization hold, record its exact amount, and provide admin release/capture controls. |
| Manual booking links | Repaired | Paid links now create a canonical booking record for admin bookings and deposit management, and retain the exact manual override or global deposit setting. |
| Admin deposits | Pass | The deposit dashboard now shows the stored amount rather than assuming $500. |
| Analytics | Pass | GA4 is installed with privacy-safe SPA events; the legacy unresolved Umami loader was removed. |
| Legal pages and SEO support | Pass | Terms, privacy, robots.txt, sitemap.xml, Tyler Guide, and admin login routes were successfully reached in the public-route check. |
| Automated tests | Pass | 15 test files / 48 tests passed after repairs. |
| TypeScript and production build | Pass | `npx tsc --noEmit` and `pnpm run build` completed successfully. |

## Repairs included in this audit

1. **Manual booking security deposit holds**
   - Manual Stripe Checkout now saves a reusable payment method.
   - After a successful payment, the system creates a separate Stripe PaymentIntent with `capture_method: manual` for the owner-selected deposit amount.
   - A Stripe idempotency key prevents duplicate deposit holds if the guest return page and webhook arrive together.
   - Guest confirmation pages accurately show **placed**, **processing**, **failed**, or **not required** instead of claiming every hold was placed.

2. **Manual booking administration**
   - New paid manual booking links now create an ordinary `bookings` record.
   - The record is linked back to the manual booking link, allowing the booking to appear in Admin Bookings and Admin Deposits.
   - Hostaway reservation creation and payment reconciliation use the same confirmed-booking path as direct website checkout.

3. **Deposit amount persistence**
   - Added the nullable `bookings.depositHoldAmount` database column.
   - The amount is stored with the Stripe authorization and displayed in the admin deposit dashboard.
   - The production column was created and verified as `decimal(10,2)`.

4. **Guest experience and analytics cleanup**
   - Removed an obsolete Umami script with unresolved Vite placeholders.
   - Removed the current property from its own “More Properties You May Like” recommendations.

## Operational notes

### Historical manual links

There are **13 historical paid manual links** created before the new canonical-booking workflow. All have a Hostaway reservation reference and Stripe Checkout session reference, but do not have a local `bookingId`. New manual bookings no longer have this gap.

These old links were intentionally **not backfilled automatically** because several are missing stored guest name, email, and/or phone values. A backfill should be performed only after reconciling those records with Stripe/Hostaway data, rather than inserting incomplete historical booking records.

### Database migration history

The production database has legacy schema-history drift from prior manual repairs. The current production schema was verified for the new deposit amount column and current application code. Before using a generic Drizzle migration command in the future, reconcile existing migrations 0019–0023 with `__drizzle_migrations` to avoid attempts to recreate tables or columns that already exist.

## Recommended routine monitoring

| Frequency | Action |
|---|---|
| After the next direct and manual bookings | Confirm the booking appears in Admin Bookings, Hostaway, and Admin Deposits with a `requires_capture` / authorized deposit state. |
| Weekly | Review any owner alerts labeled Hostaway payment reconciliation or deposit hold failure. |
| Monthly | Review GA4 + Search Console organic-search reports and audit booking conversion events. |
| Before schema changes | Verify production columns against `drizzle/schema.ts` and reconcile the legacy migration ledger first. |

## Validation commands

```bash
pnpm test            # 48 tests passed
npx tsc --noEmit     # passed
pnpm run build       # passed
```
