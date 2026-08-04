CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertySlug` varchar(64) NOT NULL,
	`guestName` varchar(128) NOT NULL,
	`guestEmail` varchar(320),
	`rating` int NOT NULL,
	`title` varchar(256),
	`body` text NOT NULL,
	`hostResponse` text,
	`isVisible` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
