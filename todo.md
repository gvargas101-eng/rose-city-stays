# Rose City Stays — Project TODO

## Completed Features

- [x] Full React/TypeScript website with homepage, property grid, and detail pages
- [x] Rose City Luxe design system (dark/light theme, custom fonts, brand colors)
- [x] Navigation bar with mobile responsiveness
- [x] Hero section with full-screen background image
- [x] Stats bar (10 properties, 4.9 stars, 24/7 check-in, 500+ Mbps)
- [x] Property grid with 10 property cards
- [x] Property filtering system (guests, bedrooms, property type)
- [x] Property detail pages with photo gallery
- [x] Photo lightbox/carousel with full-screen viewer, arrow navigation, keyboard support, thumbnail strip
- [x] Why Book Direct section
- [x] About section
- [x] Tyler TX section
- [x] Testimonials section
- [x] Blog section with 6 SEO-optimized articles
- [x] Blog preview on homepage (3 featured articles)
- [x] Contact/inquiry form on homepage
- [x] Direct inquiry form on property detail pages
- [x] Full-stack tRPC backend with inquiry submission
- [x] Owner notifications via notifyOwner for new inquiries
- [x] Hostaway API integration (Account ID: 127000)
- [x] All 10 properties mapped to Hostaway listing IDs
- [x] Backend calendar API returning live availability, pricing, minimum stay
- [x] Backend basePrice API returning live nightly pricing
- [x] 60-second keepalive ping to prevent server hibernation timeouts
- [x] Real photos for Hollytree Golf (34 photos)
- [x] Real photos for Noir at Hollytree (33 photos)
- [x] Real photos for Hollytree Townhouse (29 photos)
- [x] Real photos for Hollytree King (29 photos)
- [x] Real photos for Azalea Cottage (31 photos)
- [x] Real photos for Green Acres (30 photos)
- [x] Real photos for Legacy House (33 photos)
- [x] Availability calendar UI component (AvailabilityCalendar.tsx)
- [x] Calendar integrated into property detail pages
- [x] Live pricing shown in booking sidebar ($X/night from Hostaway)
- [x] Inquiry form wired to tRPC backend on property detail pages
- [x] SEO meta tags, sitemap.xml, robots.txt, schema markup
- [x] 12 unit tests passing (auth, hostaway, inquiry)

## Pending Features

- [x] Upload real photos for The Briar (sourced from Airbnb)
- [x] Upload real photos for Wall Ave. Retreat (sourced from Airbnb)
- [x] Upload real photos for The Alamo House (sourced from Airbnb)
- [ ] Direct booking with payment processing (Stripe integration)
- [ ] Date range picker in inquiry form (check-in / check-out date selection)
- [ ] Custom domain setup (rosecitystays.com)
- [ ] Final end-to-end testing before replacing owner's existing site

## New Requests (Apr 2)

- [x] Show nightly pricing on each available date cell in the availability calendar
- [x] Fix "Book on Hostaway" link to go to the correct Hostaway listing page for each property
- [x] Upload real photos for Legacy House (already had photos)
- [x] Upload real photos for The Alamo House (sourced from Airbnb) (pending user upload)
- [x] Upload real photos for Briar Cote / The Briar (sourced from Airbnb)
- [x] Upload real photos for Green Acres (sourced from Airbnb)

## Photo Import from Hostaway (Apr 2)

- [x] Fetch photos from Hostaway API for The Alamo House (329644)
- [x] Fetch photos from Hostaway API for Wall Ave. Retreat (329642)
- [x] Fetch photos from Hostaway API for The Briar (329641)
- [x] Fetch photos from Hostaway API for Green Acres (329645)
- [x] Upload all fetched photos to CDN (using Airbnb CDN URLs directly)
- [x] Update properties.ts with real CDN photo URLs for all 4 properties

## Guest Reviews Section

- [x] Fetch real guest reviews from Hostaway API for all 10 properties (645 reviews total)
- [x] Store reviews in client/src/lib/reviews.ts (auto-generated from Hostaway API)
- [x] Build ReviewsSection component with star ratings, reviewer name, date, and text
- [x] Add ReviewsSection to PropertyDetail page below the House Rules section
- [x] Show aggregate rating and review count in the section header
