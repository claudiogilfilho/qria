CREATE TABLE `brandDirections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`round` int NOT NULL,
	`optionKey` varchar(1) NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` json NOT NULL,
	`logoImageUrl` text,
	`status` enum('proposed','rejected','selected') NOT NULL DEFAULT 'proposed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brandDirections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brandSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`ownerId` int NOT NULL,
	`answers` json NOT NULL,
	`status` enum('draft','in_progress','generating','selected') NOT NULL DEFAULT 'draft',
	`currentRound` int NOT NULL DEFAULT 0,
	`selectedDirectionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`differentials` text NOT NULL,
	`status` enum('draft','in_progress','selected') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `brand_directions_session_round_idx` ON `brandDirections` (`sessionId`,`round`);--> statement-breakpoint
CREATE INDEX `brand_sessions_owner_idx` ON `brandSessions` (`ownerId`);--> statement-breakpoint
CREATE INDEX `brand_sessions_brand_idx` ON `brandSessions` (`brandId`);--> statement-breakpoint
CREATE INDEX `brands_owner_idx` ON `brands` (`ownerId`);