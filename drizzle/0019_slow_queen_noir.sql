CREATE TABLE `discount_code_uses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discountCodeId` int NOT NULL,
	`bookingId` int,
	`guestEmail` varchar(320) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discount_code_uses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`discountType` enum('percent','fixed') NOT NULL DEFAULT 'percent',
	`discountValue` decimal(8,2) NOT NULL,
	`maxTotalUses` int,
	`maxUsesPerGuest` int NOT NULL DEFAULT 3,
	`expiresAt` bigint,
	`propertyRestrictions` text,
	`isActive` int NOT NULL DEFAULT 1,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `guest_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(256) NOT NULL,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`email` varchar(320),
	`normalizedEmail` varchar(320),
	`phone` varchar(32),
	`normalizedPhone` varchar(32),
	`hostawayGuestId` varchar(64),
	`lastHostawayReservationId` varchar(64),
	`lastPropertySlug` varchar(128),
	`lastChannel` varchar(128),
	`totalReservations` int NOT NULL DEFAULT 0,
	`firstStayAt` bigint,
	`lastStayAt` bigint,
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guest_sync_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncKey` varchar(64) NOT NULL DEFAULT 'hostaway-guests',
	`lastHistoricalImportAt` timestamp,
	`lastWebhookSyncAt` timestamp,
	`lastReconciledAt` timestamp,
	`lastStatus` varchar(32) NOT NULL DEFAULT 'never',
	`lastError` text,
	`lastImportedReservations` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_sync_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `guest_sync_state_syncKey_unique` UNIQUE(`syncKey`)
);
--> statement-breakpoint
CREATE TABLE `hostaway_guest_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hostawayReservationId` varchar(64) NOT NULL,
	`guestProfileId` int NOT NULL,
	`hostawayListingId` int,
	`propertySlug` varchar(128),
	`channel` varchar(128),
	`reservationStatus` varchar(64),
	`arrivalAt` bigint,
	`departureAt` bigint,
	`guestCount` int,
	`sourceUpdatedAt` bigint,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hostaway_guest_reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `hostaway_guest_reservations_hostawayReservationId_unique` UNIQUE(`hostawayReservationId`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `addonsSnapshot` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `discountCodeId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `discountCodeLabel` varchar(128);--> statement-breakpoint
ALTER TABLE `bookings` ADD `discountCodeAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `manual_booking_links` ADD `discountLabel` varchar(128);--> statement-breakpoint
ALTER TABLE `manual_booking_links` ADD `guestPhone` varchar(32);--> statement-breakpoint
CREATE INDEX `guest_profiles_normalized_email_idx` ON `guest_profiles` (`normalizedEmail`);--> statement-breakpoint
CREATE INDEX `guest_profiles_normalized_phone_idx` ON `guest_profiles` (`normalizedPhone`);--> statement-breakpoint
CREATE INDEX `guest_profiles_last_name_idx` ON `guest_profiles` (`lastName`);--> statement-breakpoint
CREATE INDEX `hostaway_guest_reservations_profile_idx` ON `hostaway_guest_reservations` (`guestProfileId`);--> statement-breakpoint
CREATE INDEX `hostaway_guest_reservations_listing_idx` ON `hostaway_guest_reservations` (`hostawayListingId`);