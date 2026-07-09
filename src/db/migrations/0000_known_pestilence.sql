CREATE TYPE "public"."employee_role" AS ENUM('manager', 'bartender', 'barback', 'waiter', 'host');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'casual');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('off', 'opening', 'mid', 'closing', 'double');