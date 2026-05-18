CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`shortName` varchar(64) NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'House',
	`guests` int NOT NULL DEFAULT 4,
	`bedrooms` int NOT NULL DEFAULT 2,
	`bathrooms` decimal(3,1) NOT NULL DEFAULT '1.0',
	`description` text,
	`shortDescription` varchar(512),
	`neighborhood` varchar(128),
	`checkInTime` varchar(16) DEFAULT '3:00 PM',
	`checkOutTime` varchar(16) DEFAULT '11:00 AM',
	`cancellationPolicy` text,
	`hostawayListingId` int,
	`cleaningFee` decimal(8,2) NOT NULL DEFAULT '125.00',
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `property_amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`amenity` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `property_amenities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`url` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_photos_id` PRIMARY KEY(`id`)
);
