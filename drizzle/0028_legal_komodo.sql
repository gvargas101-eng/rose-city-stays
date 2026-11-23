CREATE TABLE `owner_booking_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`eventKey` varchar(128) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` varchar(32) NOT NULL,
	`reference` varchar(256) NOT NULL,
	`stripeCheckoutSessionId` varchar(256),
	`hostawayChargeId` varchar(64),
	`hostawaySyncStatus` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_booking_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_booking_payments_eventKey_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `bookingSource` varchar(32) DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paidAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `bookings` ADD `externalPaymentReference` varchar(256);--> statement-breakpoint
ALTER TABLE `bookings` ADD `ownerRequestKey` varchar(64);--> statement-breakpoint
ALTER TABLE `bookings` ADD `ownerCreatedBy` varchar(128);--> statement-breakpoint
ALTER TABLE `bookings` ADD `ownerCreateError` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ownerRequestKey_unique` UNIQUE(`ownerRequestKey`);--> statement-breakpoint
CREATE INDEX `owner_booking_payments_booking_idx` ON `owner_booking_payments` (`bookingId`);