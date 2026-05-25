CREATE TABLE `artisan_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`categoryId` int NOT NULL,
	`bio` text,
	`yearsExperience` int,
	`state` varchar(100) NOT NULL,
	`lga` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`area` varchar(100),
	`serviceAreas` text,
	`startingPrice` decimal(10,2),
	`profilePhotoUrl` varchar(500),
	`verificationStatus` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `artisan_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `featured_artisans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artisanId` int NOT NULL,
	`categoryId` int,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featured_artisans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(100) NOT NULL,
	`lga` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`area` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artisanId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`caption` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportedArtisanId` int NOT NULL,
	`reporterName` varchar(255) NOT NULL,
	`reporterPhone` varchar(20) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`description` text,
	`status` enum('open','investigating','resolved','dismissed') NOT NULL DEFAULT 'open',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artisanId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientPhone` varchar(20) NOT NULL,
	`clientWhatsapp` varchar(20),
	`categoryId` int NOT NULL,
	`state` varchar(100) NOT NULL,
	`lga` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`area` varchar(100),
	`description` text NOT NULL,
	`urgency` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`budgetRange` varchar(100),
	`status` enum('open','assigned','completed','cancelled') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('client','artisan','admin') NOT NULL DEFAULT 'client';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `whatsappNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended','pending') DEFAULT 'active' NOT NULL;