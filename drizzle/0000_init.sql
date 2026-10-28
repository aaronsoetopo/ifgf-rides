CREATE TABLE `drivers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`campus` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`seats` integer NOT NULL,
	`car` text,
	`max_pickup_miles` real DEFAULT 15 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `ride_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`distance_miles` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`responded_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `ride_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ride_invites_request_driver_idx` ON `ride_invites` (`request_id`,`driver_id`);--> statement-breakpoint
CREATE INDEX `ride_invites_driver_idx` ON `ride_invites` (`driver_id`,`status`);--> statement-breakpoint
CREATE TABLE `ride_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`passenger_id` text NOT NULL,
	`campus` text NOT NULL,
	`service_date` text NOT NULL,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`party_size` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`driver_id` text,
	`matched_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`passenger_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ride_requests_campus_date_idx` ON `ride_requests` (`campus`,`service_date`);--> statement-breakpoint
CREATE INDEX `ride_requests_driver_date_idx` ON `ride_requests` (`driver_id`,`service_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);