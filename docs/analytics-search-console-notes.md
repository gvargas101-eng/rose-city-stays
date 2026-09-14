# GA4 and Search Console Setup Notes

## Verified Accounts and Properties

- **GA4 property:** `www.rosecitystays.com` (property ID `529691560`)
- **GA4 web stream:** `www.rosecitystays.com` (stream ID `14210950555`)
- **Installed Measurement ID:** `G-H1TSCV17BB`
- **Search Console property:** `https://www.rosecitystays.com/`
- **Google account observed:** `gvargas101@gmail.com`

## Live Verification Notes

- The published homepage serves the GA4 `gtag.js` loader and Measurement ID `G-H1TSCV17BB`.
- The GA4 property dashboard displays existing Rose City Stays page-view and organic-search activity, confirming that the selected Analytics property is receiving website data.
- Search Console is verified for `https://www.rosecitystays.com/` under the same signed-in Google account.
- **Association completed September 14, 2026:** Google Search Console now lists `www.rosecitystays.com` GA4 property ID `529691560` and its `www.rosecitystays.com` web data stream as an associated service. There are no pending association requests.

## Official Requirements and Steps

Google’s GA4 instructions state that creating a Search Console link requires the **Editor** role in the Google Analytics property and verified ownership of the Search Console property. In Google Analytics, go to **Admin → Product links → Search Console links → Link**, choose the owned Search Console property, select the matching GA4 web stream, and submit. Search Console data may take up to 48 hours to appear in Analytics.

Source: [Google Analytics Help — Connect Search Console to Google Analytics](https://support.google.com/analytics/answer/10737381?hl=en)

Google’s SEO guidance distinguishes Search Console (search visibility, queries, clicks, and impressions) from GA4 (on-site behavior and conversions). Its recommended core organic-search metrics are GA4 sessions and engagement rate, alongside Search Console clicks and CTR.

Source: [Google Search Central — Using Search Console and Google Analytics data for SEO](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)

## Reporting Timing and Routine

- **GA4 Realtime:** page views normally appear within minutes. The GA4 dashboard already displays Rose City Stays website activity.
- **GA4 Search Console reports:** Google documents a potential **48-hour** reporting delay after the association.
- **Monthly SEO review:** compare Search Console clicks and CTR with GA4 organic sessions, engagement rate, `view_item`, `begin_checkout`, and `purchase` events. Use Search Console as the source of truth for search impressions, queries, clicks, and indexing.
