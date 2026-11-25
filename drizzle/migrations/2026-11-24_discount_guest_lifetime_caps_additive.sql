-- REVIEWED ADDITIVE DISCOUNT MIGRATION. Do not run this AND 0030_public_king_cobra.sql.
-- Parent must apply through managed webdev_execute_sql after reviewing production checks.
-- PRECHECK (read-only):
-- SELECT COUNT(*) AS historical_rows FROM discount_code_uses; -- verified 5 before migration
-- SELECT discountCodeId, bookingId, COUNT(*) FROM discount_code_uses
-- WHERE bookingId IS NOT NULL GROUP BY discountCodeId, bookingId HAVING COUNT(*) > 1;
-- Must be no duplicate groups. Do NOT delete or rewrite historical rows if duplicates exist.
-- SHOW TABLES LIKE 'discount_code_claims'; SHOW TABLES LIKE 'discount_code_guest_overrides';
-- SHOW INDEX FROM discount_code_uses; -- do not reapply an already-existing unique guard
-- Ensure MySQL/TiDB transaction support and campaign row SELECT FOR UPDATE works.

CREATE TABLE `discount_code_claims` (
  `id` varchar(36) NOT NULL,
  `checkoutKey` varchar(128) NOT NULL,
  `discountCodeId` int NOT NULL,
  `guestEmail` varchar(320) NOT NULL,
  `discountAmount` decimal(10,2) NOT NULL,
  `status` enum('pending','succeeded','released') NOT NULL DEFAULT 'pending',
  `bookingId` int,
  `stripeCheckoutSessionId` varchar(256),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `settledAt` timestamp,
  CONSTRAINT `discount_code_claims_id` PRIMARY KEY (`id`),
  CONSTRAINT `discount_code_claims_checkoutKey_unique` UNIQUE (`checkoutKey`),
  CONSTRAINT `discount_code_claims_stripeCheckoutSessionId_unique` UNIQUE (`stripeCheckoutSessionId`)
);
CREATE TABLE `discount_code_guest_overrides` (
  `id` int AUTO_INCREMENT NOT NULL,
  `discountCodeId` int NOT NULL,
  `guestEmail` varchar(320) NOT NULL,
  `maxUses` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `discount_code_guest_overrides_id` PRIMARY KEY (`id`),
  CONSTRAINT `discount_guest_override_unique` UNIQUE (`discountCodeId`, `guestEmail`)
);
ALTER TABLE `discount_code_uses` ADD CONSTRAINT `discount_code_uses_code_booking_unique` UNIQUE (`discountCodeId`, `bookingId`);
CREATE INDEX `discount_claim_capacity_idx` ON `discount_code_claims` (`discountCodeId`, `status`);
CREATE INDEX `discount_claim_booking_idx` ON `discount_code_claims` (`bookingId`);

-- POSTCHECK (read-only): count still 5; compare all original rows/ids/guestEmail/amount/time
-- against pre-migration export, no existing coupon values or history changed.
-- SHOW INDEX FROM discount_code_uses; SHOW CREATE TABLE discount_code_claims;
-- SHOW CREATE TABLE discount_code_guest_overrides;
-- New tables should contain zero rows until application use. No data backfill is needed.
