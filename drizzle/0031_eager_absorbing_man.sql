CREATE TABLE `booking_cancellation_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int,
	`manualLinkId` int,
	`policyId` varchar(128) NOT NULL,
	`policyText` text NOT NULL,
	`acceptedAt` bigint,
	`recordedAt` bigint NOT NULL,
	CONSTRAINT `booking_cancellation_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_cancellation_policies_bookingId_unique` UNIQUE(`bookingId`),
	CONSTRAINT `booking_cancellation_policies_manualLinkId_unique` UNIQUE(`manualLinkId`)
);
--> statement-breakpoint
CREATE TABLE `cancellation_request_limits` (
	`bucketKey` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 1,
	`expiresAt` bigint NOT NULL,
	CONSTRAINT `cancellation_request_limits_bucketKey` PRIMARY KEY(`bucketKey`)
);
--> statement-breakpoint
CREATE TABLE `cancellation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestKey` varchar(64) NOT NULL,
	`requestHash` varchar(64) NOT NULL,
	`activeRequestKey` varchar(64),
	`reservationReference` varchar(128) NOT NULL,
	`bookingEmail` varchar(320) NOT NULL,
	`phone` varchar(32),
	`reason` text NOT NULL,
	`acknowledgedAt` bigint NOT NULL,
	`requestedAt` bigint NOT NULL,
	`status` enum('pending','reviewed','declined','resolved') NOT NULL DEFAULT 'pending',
	`reviewNotes` text,
	`reviewedAt` bigint,
	`reviewedBy` varchar(128),
	CONSTRAINT `cancellation_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `cancellation_requests_requestKey_unique` UNIQUE(`requestKey`),
	CONSTRAINT `cancellation_requests_activeRequestKey_unique` UNIQUE(`activeRequestKey`)
);
--> statement-breakpoint
CREATE INDEX `cancellation_request_limits_expiry_idx` ON `cancellation_request_limits` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `cancellation_requests_status_time_idx` ON `cancellation_requests` (`status`,`requestedAt`);