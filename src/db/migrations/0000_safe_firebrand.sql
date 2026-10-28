CREATE TYPE "public"."demand_level" AS ENUM('very_low', 'low', 'normal', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."employee_role" AS ENUM('manager', 'bartender', 'barback', 'waiter', 'host');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'casual');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('junior', 'intermediate', 'senior');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."service_period" AS ENUM('breakfast', 'lunch', 'dinner', 'full_day');--> statement-breakpoint
CREATE TYPE "public"."shift_type" AS ENUM('off', 'opening', 'mid', 'closing', 'double');--> statement-breakpoint
CREATE TABLE "rp_employees" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "employee_role" NOT NULL,
	"experience_level" "experience_level",
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"time_zone" text DEFAULT 'Africa/Johannesburg' NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"locale" text DEFAULT 'en-ZA' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "rp_scheduling_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"default_shift_hours" integer DEFAULT 8 NOT NULL,
	"minimum_rest_hours" integer DEFAULT 11 NOT NULL,
	"days_off_per_week" integer DEFAULT 2 NOT NULL,
	"allow_double_shift" boolean DEFAULT true NOT NULL,
	"allow_early_finish" boolean DEFAULT true NOT NULL,
	"opening_shift_start" time DEFAULT '09:00:00' NOT NULL,
	"opening_shift_end" time DEFAULT '17:00:00' NOT NULL,
	"closing_shift_start" time DEFAULT '15:00:00' NOT NULL,
	"closing_shift_end" time DEFAULT '02:00:00' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rp_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"week_start_date" date NOT NULL,
	"status" "schedule_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rp_shift_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"date" date NOT NULL,
	"shift_type" "shift_type" NOT NULL,
	"is_early_finish" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rp_employees" ADD CONSTRAINT "rp_employees_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_restaurants" ADD CONSTRAINT "rp_restaurants_organization_id_rp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."rp_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_service_forecasts" ADD CONSTRAINT "rp_service_forecasts_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_scheduling_policies" ADD CONSTRAINT "rp_scheduling_policies_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_schedules" ADD CONSTRAINT "rp_schedules_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_shift_assignments" ADD CONSTRAINT "rp_shift_assignments_schedule_id_rp_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."rp_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_shift_assignments" ADD CONSTRAINT "rp_shift_assignments_employee_id_rp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."rp_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_restaurant_idx" ON "rp_employees" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "employees_email_idx" ON "rp_employees" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_idx" ON "rp_organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_unique" ON "rp_restaurants" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "service_forecasts_restaurant_date_period_unique" ON "rp_service_forecasts" USING btree ("restaurant_id","service_date","service_period");--> statement-breakpoint
CREATE INDEX "service_forecasts_restaurant_date_idx" ON "rp_service_forecasts" USING btree ("restaurant_id","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_policies_restaurant_unique" ON "rp_scheduling_policies" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "scheduling_policies_restaurant_idx" ON "rp_scheduling_policies" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_restaurant_week_unique" ON "rp_schedules" USING btree ("restaurant_id","week_start_date");--> statement-breakpoint
CREATE INDEX "schedules_restaurant_idx" ON "rp_schedules" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_schedule_employee_date_unique" ON "rp_shift_assignments" USING btree ("schedule_id","employee_id","date");--> statement-breakpoint
CREATE INDEX "shift_assignments_schedule_idx" ON "rp_shift_assignments" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_employee_idx" ON "rp_shift_assignments" USING btree ("employee_id");