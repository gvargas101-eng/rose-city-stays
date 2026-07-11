ALTER TABLE `bookings` ADD `depositHoldIntentId` varchar(256);--> statement-breakpoint
ALTER TABLE `bookings` ADD `depositHoldStatus` enum('pending','authorized','captured','released','failed');