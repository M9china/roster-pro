CREATE TYPE "public"."employee_role" AS ENUM('manager', 'bartender', 'barback', 'waiter', 'host');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'casual');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('off', 'opening', 'mid', 'closing', 'double');--> statement-breakpoint
CREATE TABLE "rp_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text NOT NULL,
	"slug" text NOT NULL,
	"time_zone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rp_restaurants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text DEFAULT 'Africa/Johannesburg' NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"locale" text DEFAULT 'en-ZA' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rp_restaurants" ADD CONSTRAINT "rp_restaurants_organization_id_rp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."rp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_idx" ON "rp_organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_unique" ON "rp_restaurants" USING btree ("organization_id","slug");