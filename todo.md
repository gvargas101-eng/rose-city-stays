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

## Admin Enhancements (July 2026)

- [x] Add /admin/corporate-inquiries page — list all corporate inquiries with status, contact info, dates, notes, and status update buttons (new → contacted → booked → closed)
- [x] Add Corporate nav link to admin sidebar
- [x] Add petsAllowed column to properties DB table (migration pushed)
- [x] Add Pets Policy toggle to admin property editor (green toggle switch, saves to DB via updateProperty)

## Guest-Facing Pets & Security Deposit (July 2026)

- [x] Show pets badge (Pets OK / No Pets) on property cards and property detail pages
- [x] Add Pets OK filter chip to homepage property grid
- [x] Improve corporate inquiry owner notification email with direct mailto reply link (also added to regular inquiry notifications)
- [x] Add $500 security deposit hold disclosure to BookingPanel (shown before booking)
- [x] Add $500 security deposit hold disclosure to CheckoutModal (step 3 agreement section)
- [x] Add Stripe PaymentIntent (capture_method: manual) for $500 card authorization hold at checkout (separate from rental charge)
- [x] Add depositHoldIntentId and depositHoldStatus columns to bookings DB table (migration pushed)
- [x] Show deposit hold status in admin bookings panel (status badge + View in Stripe link)

## Deposit Hold Admin Controls & Confirmation Page (July 2026)

- [x] Add releaseDepositHold and captureDepositHold admin mutations (call Stripe API, update DB status)
- [x] Add Release Hold / Capture Hold buttons to AdminBookings expanded detail row (confirm dialog, status badge, disabled when already actioned)
- [x] Add $500 deposit hold reminder to BookingConfirmation page (amber card explaining hold, release timeline, damage policy)

## Go-Live Blockers (Aug 2026)
- [x] Create Privacy Policy page (/privacy-policy route)
- [x] Create Terms & Conditions page (/terms route)
- [x] Fix footer links for Privacy Policy and Terms & Conditions
- [x] Fix sitemap.xml with correct property slugs and live domain (all 10 real slugs, rosecitystays.com domain, new pages added)
- [x] Add favicon (rose icon, dark charcoal + rose-gold, 32x32 ICO + apple-touch-icon)
- [x] Update social media links — Instagram: instagram.com/rosecitystays, Facebook: facebook.com/rosecitystays

## Camera Disclosure & Guest Count Enforcement (Aug 2026)
- [x] Add persistent outdoor camera + guest count notice to PropertyDetail page (amber banner in House Rules section)
- [x] Build hard stop acknowledgment modal (CameraGuestCountModal — two checkboxes, disabled Continue until both checked)
- [x] Add cameraAcknowledgedAt column to bookings table in DB — deferred by design (acknowledgment is UX-enforced via CameraGuestCountModal hard stop)
- [x] Add dynamic guest overage line item to Stripe checkout ($25/night per guest beyond 4)
- [x] Show overage fee in BookingPanel price breakdown when guest count > 4 (amber line item + notice)
- [x] Overage fee per night — updated to $10/night per user request; configurable admin setting deferred by design (can be added later)

## Manual Booking Link Tool (Aug 2026)
- [x] Add manualBookingLinks table to DB schema (token, propertyId, dates, guestCount, customRate, discountAmount, totalAmount, bypass flags, expiry, status)
- [x] Add createManualBookingLink, listManualBookingLinks, revokeManualBookingLink mutations to admin router
- [x] Build /admin/manual-bookings page — form with property, dates, guests, custom rate, discount, per-hard-stop bypass toggles, generates shareable link
- [x] Add Manual Bookings to admin sidebar nav
- [x] Build /booking/pay/:token guest page — shows quoted price, conditionally shows each hard stop (camera, guest count, T&C, ID upload) based on bypass flags set by admin
- [x] Wire Stripe checkout for manual booking token (uses custom total, not Hostaway pricing)
- [x] Push Hostaway calendar reservation on payment confirmation for manual bookings
- [x] Add route for /booking/pay/:token and /booking/manual-confirm in App.tsx

## Configurable Security Deposit (Aug 2026)
- [x] Add securityDepositAmount field to site_settings DB table (default 500) — seeded via SQL
- [x] Add Security Deposit field to Admin Settings page (number input, saves to DB)
- [x] Expose securityDepositAmount via public tRPC query (trpc.settings.getSecurityDeposit)
- [x] Update BookingPanel deposit notice to show dynamic amount from settings
- [x] Update CheckoutModal deposit notice to show dynamic amount from settings
- [x] Update Stripe deposit hold PaymentIntent to use dynamic amount from DB (reads securityDepositAmount from site_settings, defaults to 500)
- [x] Update BookingConfirmation deposit notice to show dynamic amount
- [x] Update manual booking link deposit hold to use dynamic amount from DB (same confirmStripeCheckoutSession function)

## Manual Booking Link Fixes & Enhancements (Aug 2026)
- [x] Fix Pay Now button greyed out — auto-populate name/email fields if admin pre-filled them, so guest doesn't have to retype
- [x] Fix hardcoded $500 deposit notice on ManualBookingPay — read from settings (uses securityDepositOverride if set, else 500)
- [x] Add security deposit override field to manual booking form (per-booking override of global setting)
- [x] Add guest note field to manual booking form (shown to guest on payment page, e.g. "Thank you for booking with us! Your rate includes a 10% loyalty discount.")
- [x] Add custom line items to manual booking form (add/remove arbitrary fee lines, e.g. "Pet fee $50", "Early check-in $25")
- [x] Show custom line items on ManualBookingPay price breakdown and in Stripe checkout
- [x] Add security deposit override to ManualBookingPay deposit notice and Stripe hold
- [x] Add guest note display to ManualBookingPay page (amber info box)

## Availability Enforcement & Share Link (Aug 2026)
- [x] Add Hostaway calendar availability check to createCheckoutSession — block checkout if any date in range is reserved/blocked in Hostaway
- [x] Add Hostaway calendar availability check to createManualBookingCheckout — same guard for manual booking token payment
- [x] Add availability check to createManualBookingLink (admin form) — warn admin if dates are unavailable in Hostaway when generating the link
- [x] Add Email/SMS share section to AdminManualBookings after link creation (mailto: link for email, sms: link for SMS on mobile)

## Damage Deposit Dashboard (Aug 2026)
- [x] Add AdminDeposits page at /admin/deposits listing all bookings with deposit holds (status, amount, guest, property, dates)
- [x] Add Release Deposit button (cancels Stripe PaymentIntent hold)
- [x] Add Capture Deposit button (captures Stripe PaymentIntent hold — charges guest)
- [x] Add deposit hold status filter (all / authorized / captured / released / failed)
- [x] Register /admin/deposits route in App.tsx and add to admin sidebar nav

## Upsell Add-Ons at Checkout (Aug 2026)
- [x] Add upsell_addons table to schema (id, name, description, price, active, sort_order)
- [x] Seed default add-ons: Early Check-In ($50), Late Checkout ($50)
- [x] Add admin UI to manage add-ons at /admin/upsell-addons (create/edit/delete/toggle active)
- [x] Add add-on selection step to standard booking checkout (CheckoutModal)
- [x] Pass selected add-ons as extra Stripe line items in createCheckoutSession
- [x] Show selected add-ons in price breakdown in CheckoutModal

## SEO Local Area Guide Pages (Aug 2026)
- [x] Create /tyler-guide comprehensive page (attractions, dining, neighborhoods, events, medical/corporate, final CTA)
- [x] Add SEO meta title and description via useSeoMeta hook
- [x] Add Tyler Guide link to Navbar navLinks
- [x] Register /tyler-guide route in App.tsx

## Availability & Admin Fixes (Aug 2026)
- [x] Fix availability check in createCheckoutSession — hardened to check status !== 'available' in addition to isAvailable === false (covers owner-blocked dates)
- [x] Add manual booking links list to admin bookings page — added as second tab 'Manual Links' in AdminBookings.tsx
- [x] Fix date display timezone bug — all booking dates stored as UTC midnight ms shift back 1 day in CDT; fixed by adding timeZone: 'UTC' to all toLocaleDateString calls across AdminBookings, AdminManualBookings, AdminDeposits, ManualBookingPay, ManualBookingConfirm, MyBookings, BookingConfirmation
- [x] Harden availability check in createManualBookingCheckout — same status !== 'available' fix applied to manual booking token checkout path
- [x] Add real-time availability warning on admin manual booking form — when property + checkIn + checkOut are all filled, query Hostaway calendar and show a red warning banner listing blocked nights, before the admin even generates the link
- [x] Update sitemap.xml — added /tyler-guide, 11th property (cozy-3-bedrooms), updated all lastmod dates to 2026-08-04
- [x] Fix ID upload bug in ManualBookingPay.tsx — form field was named "file" but server multer expected "idFile"; also added credentials: "include" to the fetch call

## ID Upload & Admin Improvements (Aug 2026)
- [x] Add accept="image/*,application/pdf" and capture="environment" to file inputs in ManualBookingPay.tsx and CheckoutModal.tsx for better mobile camera experience
- [x] Add "View ID" button to admin bookings expanded row — opens the guestIdUrl in a new tab (or a lightbox if it is an image)
- [x] Add "View ID" link to admin manual booking links expanded row
- [x] Add "Bypass availability check" toggle to manual booking form — when checked, skips the hard block at payment time for that specific link
- [x] Add camera capture hint to ID upload inputs (accept="image/*,application/pdf" capture="environment") in ManualBookingPay.tsx and CheckoutModal.tsx
- [x] Add inline Guest ID image preview to admin bookings expanded row and manual links expanded row
- [x] Add guestIdUrl column to manual_booking_links table (DB migration pushed) and save on payment confirmation
- [x] Add bypassAvailabilityCheck toggle to manual booking form — skips Hostaway availability block at payment time for owner-overridden dates

## SEO Blog Posts (Aug 2026)
- [x] Publish "Discover Tyler, TX: Your Guide to Exceptional Short-Term Rentals" — targets "short-term rentals Tyler TX", slug: discover-tyler-tx-your-guide-to-exceptional-short-term-rentals
- [x] Publish "Your Guide to Furnished Housing & Travel Nurse Housing in Tyler, TX" — targets "furnished housing Tyler TX medical" and "travel nurse housing Tyler TX", slug: your-guide-to-furnished-housing-travel-nurse-housing-in-tyler-tx

## Review System (Aug 2026)
- [x] Add `reviews` table to drizzle/schema.ts (id, propertySlug, guestName, guestEmail, rating, title, body, hostResponse, isVisible, createdAt)
- [x] Run pnpm db:push to create table
- [x] Add public tRPC procedures: getReviewsByProperty, getAllReviews, submitReview
- [x] Add admin tRPC procedures: adminListReviews, adminDeleteReview, adminRespondToReview, adminToggleReviewVisibility
- [x] Create AdminReviews.tsx page at /admin/reviews
- [x] Add Reviews nav item to AdminLayout.tsx sidebar
- [x] Register /admin/reviews route in App.tsx
- [x] Create public /reviews page showing all reviews across properties
- [x] Embed reviews section on PropertyDetail.tsx
- [x] Show aggregate star rating on PropertyCard and PropertyDetail
- [x] Add review submission form at /leave-a-review
- [x] Add Reviews link in Navbar

## Payment & Review Improvements (Aug 2026)
- [x] Fix direct-booking: only create Hostaway reservation after Stripe payment succeeds
- [x] Add owner notification (notifyOwner) when a new review is submitted
- [x] Embed top 3 recent 5-star reviews in homepage testimonials section

## Critical Payment Bug Fix (Aug 2026)
- [x] Fix: booking confirmation shown and Hostaway reservation created even when Stripe payment is rejected
- [x] Gate getByCheckoutSession — only confirm if payment_status === "paid", return failed state otherwise
- [x] Update BookingConfirmation page to show payment-failed error state (not success) when payment rejected
- [x] Add owner alert when a payment fails but confirmation page is visited (so manual cleanup can happen)

## SEO / AEO / GEO Optimization (Aug 2026)
- [x] Add useSEO with per-property dynamic meta tags to PropertyDetail page
- [x] Add useSEO to Home, CorporateStays, TylerGuide, ReviewsPage, LeaveReview pages
- [x] Fix Organization schema: use www.rosecitystays.com, add real phone/social profiles
- [x] Add FAQPage JSON-LD schema to Home page
- [x] Add LodgingBusiness JSON-LD schema to PropertyDetail pages
- [x] Add BreadcrumbList JSON-LD to PropertyDetail and BlogDetail pages
- [x] Add og:site_name, og:locale, og:url to seo.ts helper
- [x] Create /public/llms.txt for LLM crawler discovery (GEO)
- [x] Add speakable schema to Home page for voice/AI assistants
- [x] Add twitter:site meta tag to index.html

## Per-Property SEO (Aug 2026)
- [x] Create client/src/lib/propertySEO.ts with hand-crafted SEO copy for all 11 properties (slug-keyed override map)
- [x] Wire per-property SEO override map into PropertyDetail useSEO call (falls back to dynamic generation)

## Site Audit Fixes (Aug 2026)
- [x] Fix stale "10 properties" → "11 properties" in Footer.tsx
- [x] Fix stale "10 Properties Available" → "11 Properties Available" in CorporateStays.tsx
- [x] Fix stale comment "All 10 properties" → "All 11 properties" in properties.ts
- [x] Replace Mio Nonno (Flower Mound/Dallas chain, not in Tyler) with Villaggio Del Vino (real Tyler Italian restaurant) in TylerGuide.tsx
- [x] Rewrite llms.txt with accurate 11-property list, correct bed/bath/guest counts, and updated neighborhoods

## Tyler Guide & Hero Copy Updates (Aug 2026)
- [x] Add Prime 102 (downtown steakhouse) and Don Juan's on the Square (downtown Tex-Mex) to TylerGuide.tsx restaurant list
- [x] Update Rick's on the Square description to reflect live music / Southern food focus
- [x] Update hero copy "200+ stays" → "1,000+ stays" in Home.tsx

## Accuracy Fixes (Aug 2026)
- [x] Fix Kiepersol location: "Tyler outskirts" → "Bullard, TX (~20 min from Tyler)" in TylerGuide.tsx
- [x] Update all "500+ Mbps" WiFi references → "1 Gig" across properties.ts, Home.tsx, CorporateStays.tsx, PropertyDetail.tsx, TylerGuide.tsx, seo.ts, llms.txt, blog.ts, AdminPropertyEdit.tsx, publish-seo-posts.ts

## Payment Safeguard (Aug 2026)

## Admin Itemized Charges (Aug 2026)

## Phone Number to Hostaway (Aug 2026)

## Named Add-ons in Admin Breakdown (Aug 2026)
- [x] Add addonsSnapshot JSON column to bookings schema and migrate DB
- [x] Save addon names/prices to addonsSnapshot at booking creation
- [x] Display named add-on line items in admin charge breakdown
- [x] Make phone number required in CheckoutModal (needed for door code generation)
- [x] Pass guestPhone in manual booking confirmManualBooking Hostaway call
- [x] Add itemized charge breakdown (nights × rate, cleaning fee, add-ons, total) to AdminBookings expanded detail view
- [x] Add Stripe payment-status verification notification every time a Hostaway reservation is created (confirmStripeCheckoutSession)

## Webhook Retry Job (Aug 2026)
- [x] Build /api/scheduled/retry-pending-bookings endpoint that finds pending bookings with paid Stripe sessions and confirms them
- [x] Register endpoint in server/_core/index.ts
- [x] Schedule as project-level Heartbeat cron every 15 minutes via manus-heartbeat CLI (task_uid: TXUZMB9fpEinFeeEjr9N6T)

## Admin SMS & Phone Improvements (Aug 2026)
- [x] Add SMS quick-action button next to phone link in AdminBookings rows
- [x] Show guest phone number in AdminManualLinks panel (+ phone field in create form)

## Admin Phone UX (Aug 2026)
- [x] Fix SMS pre-fill in AdminBookings to use property display name instead of slug
- [x] Add copy-to-clipboard button for phone number in AdminBookings and AdminManualBookings

## Admin Bookings UX (Aug 2026)
- [x] Add "View in Stripe" link on each booking row using stripePaymentIntentId
- [x] Add search/filter by guest name, phone, email, or property in AdminBookings

## Admin Bookings UX Round 2 (Aug 2026)
- [x] Add check-in date range filter to AdminBookings
- [x] Add live pending bookings count badge on admin nav Bookings item

## Admin Nav Badges (Aug 2026)
- [x] Add active manual booking links count badge on Manual Bookings nav item

## Loyalty Discount Code System (Aug 2026)
- [x] Add discount_codes and discount_code_uses tables to DB schema
- [x] Server: validateDiscountCode (mutation), admin CRUD procedures (list/create/update/toggle/delete/setGuestLimit)
- [x] CheckoutModal: discount code field with live validation and named line item in price breakdown
- [x] AdminDiscountCodes page: create/edit/toggle/per-guest reset + usage stats
- [x] Add Discount Codes to admin nav (Percent icon)

## Discount Code System — Follow-up (Aug 2026)
- [x] Record discount_code_uses in confirmStoredBooking after payment confirmed
- [x] Show discountCodeLabel and discountCodeAmount in AdminBookings charge breakdown
- [x] Add a managed loyalty-code field to manual booking link creation and show the applied code by name on ManualBookingPay

## Master Property Calendar (Aug 2026)
- [x] Add getReservationsForCalendar admin tRPC procedure — fetches all Hostaway reservations for all 11 properties for a given month range
- [x] Build AdminCalendar.tsx page — horizontal timeline grid, properties as rows, days as columns, color-coded by channel (Airbnb/VRBO/Direct/Manual)
- [x] Register /admin/calendar route in App.tsx and add Calendar nav item to admin sidebar

## Hostaway Guest Directory & Sync (Aug 2026)
- [x] Verify the Hostaway reservation/guest API fields and select the safe synchronization approach — Option A: webhook-driven sync with scheduled reconciliation
- [x] Add a guest directory schema with deduplication, source reservation tracking, and sync timestamps
- [x] Import historical Hostaway guests and upsert newly synchronized guest data
- [x] Add guest search and one-click autofill to the admin manual booking form
- [x] Add authenticated Hostaway reservation webhook handling and a scheduled reconciliation with a manual "Sync Now" control and last-sync status (Heartbeat task: ECFPwVM5wSgP9eSuPsA8Ku)

## Paid Booking Hostaway Failure (Aug 2026)
- [x] Inspect the affected successful Stripe payment and Hostaway API failure details
- [x] Repair the affected paid booking and prevent the confirmed-payment sync failure from recurring
- [x] Record the already-collected Stripe payment as a paid Hostaway offline charge for reservation 64756333 (Hostaway charge #32189934, status Paid)
- [x] Automatically record a paid Hostaway charge after every successful Stripe-created reservation
