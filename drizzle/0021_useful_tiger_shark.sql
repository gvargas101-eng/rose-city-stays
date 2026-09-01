CREATE TABLE `booking_extensions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`hostawayReservationId` varchar(64) NOT NULL,
	`previousCheckOut` bigint NOT NULL,
	`newCheckOut` bigint NOT NULL,
	`additionalNights` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','payment_link_sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(256),
	`stripeCheckoutSessionId` varchar(256),
	`hostawayChargeId` varchar(64),
	`paymentError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booking_extensions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `stripeCustomerId` varchar(256);