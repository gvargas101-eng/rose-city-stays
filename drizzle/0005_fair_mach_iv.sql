CREATE TABLE `custom_fees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`type` enum('flat','percent') NOT NULL DEFAULT 'flat',
	`amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_fees_id` PRIMARY KEY(`id`)
);
