CREATE TABLE "lifeos_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" text NOT NULL,
	"type" text NOT NULL,
	"quarter" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeos_compass" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"mission" text,
	"eulogy" text,
	"success_definition" text,
	"future_paths" jsonb,
	"ideal_week" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifeos_compass_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_lifeos_quests_user_active" ON "lifeos_quests" USING btree ("user_id","archived");--> statement-breakpoint
CREATE INDEX "idx_lifeos_quests_user_quarter" ON "lifeos_quests" USING btree ("user_id","quarter");