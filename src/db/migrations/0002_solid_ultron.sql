CREATE TABLE "rp_employees" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" "employee_role" NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rp_employees" ADD CONSTRAINT "rp_employees_restaurant_id_rp_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."rp_restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_restaurant_idx" ON "rp_employees" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "employees_email_idx" ON "rp_employees" USING btree ("email");