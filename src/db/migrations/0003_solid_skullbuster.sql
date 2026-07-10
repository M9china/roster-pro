CREATE TYPE "public"."demand_level" AS ENUM('very_low', 'low', 'normal', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."service_period" AS ENUM('breakfast', 'lunch', 'dinner', 'full_day');--> statement-breakpoint
CREATE TABLE "rp_service_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"service_date" date NOT NULL,
	"service_period" "service_period" DEFAULT 'full_day' NOT NULL,
	"expected_reservations" integer DEFAULT 0 NOT NULL,
	"expected_walk_ins" integer DEFAULT 0 NOT NULL,
	"demand_level" "demand_level" DEFAULT 'normal' NOT NULL,
	"special_event" boolean DEFAULT false NOT NULL,
	"event_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rp_service_forecasts" ADD CONSTRAINT "rp_service_forecasts_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_forecasts_restaurant_date_period_unique" ON "rp_service_forecasts" USING btree ("restaurant_id","service_date","service_period");--> statement-breakpoint
CREATE INDEX "service_forecasts_restaurant_date_idx" ON "rp_service_forecasts" USING btree ("restaurant_id","service_date");