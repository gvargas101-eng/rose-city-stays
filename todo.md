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
- [x] Direct booking with payment processing (Stripe integration)
- [x] Date range picker in inquiry form (check-in / check-out date selection)
- [x] Custom domain setup (rosecitystays.com) — user action required: configure DNS in Management UI → Settings → Domains
- [x] Final end-to-end testing before replacing owner's existing site (all 19 tests passing, 0 TS errors)

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

## Direct Booking Flow (Stripe + Hostaway)

- [x] Set up Stripe integration (webdev_add_feature)
- [x] Add bookings table to DB schema (property, dates, guest info, amount, status, hostaway reservation ID)
- [x] Build date range picker on property detail page (check-in / check-out selection)
- [x] Build booking summary panel (nights, nightly rate, total, fees)
- [x] Build Stripe payment intent tRPC procedure
- [x] Build Stripe checkout UI (card element, billing info)
- [x] Build payment confirmation tRPC procedure (verify payment, create Hostaway reservation)
- [x] Create Hostaway reservation via API on successful payment
- [x] Send booking confirmation email to guest and owner notification (owner notified via Manus notification)
- [x] Build /booking/confirmation page showing reservation details
- [x] Replace "Book on Hostaway" button with native "Book Now" flow
- [x] Write unit tests for booking procedures (19 tests — procedure-level with Stripe/Hostaway/DB mocking)

## Booking Flow Fixes (Gaps)

- [x] Fix checkout flow: collect guest info BEFORE creating PaymentIntent (not placeholder data)
- [x] Replace remaining "Book on Hostaway" CTAs in Navbar and Footer with native booking links
- [x] Update Navbar "Book Now" button to scroll to properties or link to booking flow

## Admin Dashboard

- [x] Add properties table to DB schema (id, name, slug, description, tagline, address, guests, bedrooms, bathrooms, type, hostaway_listing_id, cleaning_fee, base_rate)
- [x] Add property_photos table (id, property_id, url, sort_order)
- [x] Add property_amenities table (id, property_id, amenity)
- [x] Seed DB with all 10 existing properties from properties.ts
- [x] Build admin layout with sidebar (Properties, Bookings, Settings)
- [x] Build admin property list page (/admin/properties)
- [x] Build admin property edit page (/admin/properties/:id) — edit name, description, tagline, guests, bedrooms, bathrooms, cleaning fee
- [x] Build photo management UI — upload new photos, reorder, delete
- [x] Build amenities editor — add/remove amenity tags
- [x] Build admin bookings page (/admin/bookings) — list all direct bookings with guest info, dates, status, amount
- [x] Update public property pages to read from DB instead of hardcoded properties.ts
- [x] Protect all /admin/* routes — only accessible to owner (role=admin)

## Admin Dashboard Gaps (to fix)

- [x] Add admin route guard to all /admin/* routes (redirect non-admins to home)
- [x] Migrate PropertyDetail to load property data from DB (trpc.properties.bySlug)
- [x] Add photo reorder support (← → arrow buttons) in admin property edit

## Photo Re-hosting (Fix Airbnb Hotlink Block)

- [x] Download all property photos from Airbnb CDN and re-upload to site's own CDN
- [x] Update all photo URLs in the database to use new CDN URLs
- [x] Verify photos load correctly on published site

## Standalone Admin Login (Password-Based)

- [x] Add admin_credentials table to DB (username, hashed password)
- [x] Build /admin/login page with username + password form
- [x] Add adminLogin tRPC procedure (verify password, issue session cookie)
- [x] Update AdminLayout to check for admin session (Manus OAuth OR password session)
- [x] Show admin login link in navbar for non-logged-in users visiting /admin

## New Features (June 2026)

- [x] Itemized fees/taxes in booking quote — 9% hotel occupancy tax on nightly subtotal, shown as itemized line items before payment
- [x] Admin-configurable tax rate in admin Settings page
- [x] Drag-and-drop photo upload in admin property editor (upload file directly, not just paste URL)
- [x] Guest booking confirmation email — handled via Hostaway automation (no code needed)
- [x] My Bookings page (/my-bookings) — guest enters email to look up their past/upcoming bookings
- [x] Custom fee line items in admin Settings (add/edit/delete/toggle flat $ or % fees shown in booking quote)
- [x] Admin password change page in admin Settings
- [x] Inline delete confirmation for fees (replaced browser confirm() dialog)

## Mobile Admin Access (June 2026)

- [x] Mobile-responsive admin panel — hamburger menu / collapsible sidebar for small screens

## Hostaway Auto-Sync (June 2026)

- [x] Build hostaway-sync.ts engine — fetches all listings, upserts into DB (name, description, photos, amenities, guests, bedrooms, bathrooms)
- [x] Add admin.syncHostaway tRPC mutation to admin router
- [x] Add "Hostaway Sync" section to Admin Settings with Sync Now button and result display
- [x] Nightly auto-sync scheduled via Manus schedule (2 AM CT daily)

## Auto-Blog System (June 2026)

- [x] Add blog_posts table to DB schema (slug, title, excerpt, content, featured_image, category, tags, meta_description, published, ai_generated, created_at)
- [x] Seed DB with existing 6 static blog articles from blog.ts
- [x] Build blog tRPC procedures (list, bySlug) — public, reads from DB
- [x] Update Blog.tsx and BlogDetail.tsx to read from DB via tRPC
- [x] Build server/blog-writer.ts — search Tyler TX news (web search), write post with LLM, save to DB
- [x] Add admin.generateBlogPost mutation to admin router
- [x] Add "Blog Auto-Writer" section to Admin Settings with Generate Now button + post preview
- [x] Wire bi-weekly scheduled job (every 2 weeks) to auto-generate and publish a new post

## Bug Fixes (June 2026)

- [x] Fix large blank section after property grid (About/host section failing to render — broken image)
- [x] Add nightly pricing to property cards on homepage
- [x] Hide Admin link from public navigation (only show to admin users)
- [x] Fix amenity pills not rendering on property cards
- [x] Verify Houston Cottage cover photo and review count

## Fixes (June 2026 — Round 2)

- [x] Hide Admin link from public nav entirely — access only via direct URL /admin/login
- [x] Fix blog post detail page blank content (large gap between title and body)
- [x] Replace About section image with a real property photo
- [x] Update stats bar "10 Properties" → "11 Properties"

## Checkout Flow Migration (July 2026)

- [x] Migrate checkout from Stripe PaymentIntents (embedded card form) to Stripe Checkout Sessions (hosted page)
- [x] Enable promo/coupon codes via allow_promotion_codes: true in Stripe Checkout Session
- [x] Add stripeCheckoutSessionId column to bookings table (DB migration pushed)
- [x] Fix cancel_url to use /property/:id (singular) instead of /properties/:id
- [x] Add Stripe webhook handler at /api/stripe/webhook (BEFORE express.json()) to confirm bookings on checkout.session.completed
- [x] Export confirmStripeCheckoutSession for use by webhook handler
- [x] Update BookingConfirmation page to support ?session_id=cs_xxx (new flow) and ?pi=pi_xxx (legacy)
- [x] Update CheckoutModal to redirect to Stripe hosted checkout instead of embedding PaymentElement
- [x] Update booking.test.ts to test createCheckoutSession instead of removed createPaymentIntent
- [x] All 19 tests passing, 0 TypeScript errors

## Bug Fixes (July 2026)

- [x] Fix React rules-of-hooks violation in PropertyDetail.tsx — moved all hooks before early returns so DB-only properties (e.g. cozy-3-bedrooms) load correctly

## House Rules Feature (July 2026)

- [x] Add houseRules column to DB schema (properties table)
- [x] Update hostaway-sync to pull houseRules from Hostaway API
- [x] Display house rules on property detail page

## UX Improvements (July 2026)

- [x] Redesign house rules section with icon tiles (no-smoking, no-pets, no-parties, etc.)
- [x] Block confirmed bookings in the availability calendar (feed DB bookings as blocked dates)
- [x] Show minimum stay notice in the booking panel (read from Hostaway calendar data)

## Property Page Improvements (July 2026)

- [x] Display check-in/check-out times from Hostaway on property pages
- [x] Cap guest counter at property's max occupancy from Hostaway
- [x] Show max guests notice in booking panel

## Corporate / Extended Stay Inquiry (July 2026)

- [x] Create /corporate-stays page with inquiry form (name, company, email, phone, property preference, dates, duration, notes)
- [x] Wire form submission to owner notification (notifyOwner) and DB storage
- [x] Add "Corporate Stays" link to navbar
- [x] Add corporate stays CTA section to home page (optional — navbar link is sufficient, skipped by design)

## Guest Agreement System (July 2026)

- [x] Write Texas STR lease agreement content
- [x] Write consolidated house rules page content
- [x] Build /rental-agreement standalone page
- [x] Build /house-rules standalone page
- [x] Add hard stop to checkout modal (review link + checkbox before payment)
- [x] Store agreement acceptance in DB (timestamp, IP, booking ID) — agreementAcceptedAt stored as Unix ms in bookings table

## Guest ID Verification (July 2026)

- [x] Add ID upload field to CheckoutModal (before agreement step, with verification messaging)
- [x] Add server-side ID upload endpoint (upload to S3, return secure URL)
- [x] Add guestIdUrl column to bookings table in DB schema
- [x] Show uploaded IDs in admin bookings panel (View ID link opens S3 URL in new tab, Agreement Signed timestamp shown)
