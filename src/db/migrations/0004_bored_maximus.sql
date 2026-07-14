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
ALTER TABLE "rp_scheduling_policies" ADD CONSTRAINT "rp_scheduling_policies_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_policies_restaurant_unique" ON "rp_scheduling_policies" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "scheduling_policies_restaurant_idx" ON "rp_scheduling_policies" USING btree ("restaurant_id");