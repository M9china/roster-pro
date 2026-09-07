CREATE TYPE "public"."experience_level" AS ENUM('junior', 'intermediate', 'senior');--> statement-breakpoint
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rp_employees" ADD COLUMN "experience_level" "experience_level";--> statement-breakpoint
ALTER TABLE "rp_schedules" ADD CONSTRAINT "rp_schedules_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_shift_assignments" ADD CONSTRAINT "rp_shift_assignments_schedule_id_rp_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."rp_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_shift_assignments" ADD CONSTRAINT "rp_shift_assignments_employee_id_rp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."rp_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_restaurant_week_unique" ON "rp_schedules" USING btree ("restaurant_id","week_start_date");--> statement-breakpoint
CREATE INDEX "schedules_restaurant_idx" ON "rp_schedules" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_schedule_employee_date_unique" ON "rp_shift_assignments" USING btree ("schedule_id","employee_id","date");--> statement-breakpoint
CREATE INDEX "shift_assignments_schedule_idx" ON "rp_shift_assignments" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_employee_idx" ON "rp_shift_assignments" USING btree ("employee_id");