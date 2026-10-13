ALTER TABLE `booking_changes` ADD `hostawayQuotedTotal` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_changes` ADD `priceAdjustment` decimal(10,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_changes` ADD `adjustmentReason` varchar(256);--> statement-breakpoint
UPDATE `booking_changes` SET `hostawayQuotedTotal` = `newTotalAmount` WHERE `hostawayQuotedTotal` = '0';
