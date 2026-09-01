# Direct Airbnb and Vrbo Integration Assessment

## Verified Findings — 2026-08-15

Airbnb's API is available through API Programs, not as an unrestricted per-host API. Its published terms state that an organization must participate in the appropriate program and meet requirements including an NDA, partner-specific terms, a data-security review, and ongoing API feature requirements. Airbnb publicly lists Hostaway as a Preferred+ software partner. Sources: https://www.airbnb.com/help/article/3418 and https://www.airbnb.com/software-partners.

Vrbo's supported software workflow uses a connected connectivity provider. Vrbo says that the provider becomes the operating system of record for integrated listings, availability, bookings, rates, and content. It permits iCal imports only for listings managed in the Vrbo Owner Dashboard, not for listings managed through third-party PMS software. Sources: https://help.vrbo.com/articles/About-Vrbo-integration and https://help.vrbo.com/articles/How-do-I-import-my-iCal-or-Google-calendar.

## Recommendation

Retain Hostaway as the sole channel manager and system of record for Airbnb, Vrbo, and direct-channel availability. The Rose City Stays site should continue using Hostaway for availability, pricing, reservations, and cross-channel visibility. Do not build an unofficial scraper or a parallel direct API sync. A later direct integration would require Rose City Stays to become an approved Airbnb software/API partner and a Vrbo connectivity provider or to replace Hostaway with another approved PMS/channel manager.
