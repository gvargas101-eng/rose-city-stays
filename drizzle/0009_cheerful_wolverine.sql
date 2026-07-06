CREATE TABLE `corporate_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`company` varchar(128),
	`email` varchar(256) NOT NULL,
	`phone` varchar(32),
	`propertyPreference` varchar(128),
	`checkIn` varchar(32),
	`checkOut` varchar(32),
	`durationMonths` int,
	`guestCount` int,
	`notes` text,
	`status` varchar(32) NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corporate_inquiries_id` PRIMARY KEY(`id`)
);
