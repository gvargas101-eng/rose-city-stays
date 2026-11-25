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
	CONSTRAINT `discount_code_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_code_claims_checkoutKey_unique` UNIQUE(`checkoutKey`),
	CONSTRAINT `discount_code_claims_stripeCheckoutSessionId_unique` UNIQUE(`stripeCheckoutSessionId`)
);
--> statement-breakpoint
CREATE TABLE `discount_code_guest_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`discountCodeId` int NOT NULL,
	`guestEmail` varchar(320) NOT NULL,
	`maxUses` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_code_guest_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_guest_override_unique` UNIQUE(`discountCodeId`,`guestEmail`)
);
--> statement-breakpoint
ALTER TABLE `discount_code_uses` ADD CONSTRAINT `discount_code_uses_code_booking_unique` UNIQUE(`discountCodeId`,`bookingId`);--> statement-breakpoint
CREATE INDEX `discount_claim_capacity_idx` ON `discount_code_claims` (`discountCodeId`,`status`);--> statement-breakpoint
CREATE INDEX `discount_claim_booking_idx` ON `discount_code_claims` (`bookingId`);