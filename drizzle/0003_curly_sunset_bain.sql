CREATE TABLE `admin_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_credentials_username_unique` UNIQUE(`username`)
);
