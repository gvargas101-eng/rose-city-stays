CREATE TABLE `booking_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`originalHostawayReservationId` varchar(64) NOT NULL,
	`replacementHostawayReservationId` varchar(64),
	`originalPropertyId` varchar(64) NOT NULL,
	`newPropertyId` varchar(64) NOT NULL,
	`originalCheckIn` bigint NOT NULL,
	`originalCheckOut` bigint NOT NULL,
	`newCheckIn` bigint NOT NULL,
	`newCheckOut` bigint NOT NULL,
	`originalTotalAmount` decimal(10,2) NOT NULL,
	`newTotalAmount` decimal(10,2) NOT NULL,
	`creditApplied` decimal(10,2) NOT NULL DEFAULT '0',
	`balanceDue` decimal(10,2) NOT NULL DEFAULT '0',
	`refundAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('quoted','payment_link_sent','completed','failed','cancelled') NOT NULL DEFAULT 'quoted',
	`settlement` enum('none','paid','refund_pending','refunded','credit_retained') NOT NULL DEFAULT 'none',
	`stripeCheckoutSessionId` varchar(256),
	`stripePaymentIntentId` varchar(256),
	`stripeRefundId` varchar(256),
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booking_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `booking_changes_booking_idx` ON `booking_changes` (`bookingId`);