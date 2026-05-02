CREATE TABLE "lifeos_daily_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"morning" jsonb,
	"evening" jsonb,
	"ritual_depth" text DEFAULT 'standard' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifeos_daily_checkins_user_date_unique" UNIQUE("user_id","entry_date")
);
--> statement-breakpoint
CREATE INDEX "idx_lifeos_checkins_user_date" ON "lifeos_daily_checkins" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_lifeos_checkins_workspace_date" ON "lifeos_daily_checkins" USING btree ("workspace_id","entry_date");