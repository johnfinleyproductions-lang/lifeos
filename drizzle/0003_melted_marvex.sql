CREATE TABLE "lifeos_protocol_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"run_date" date NOT NULL,
	"payload" jsonb NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeos_confidence_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" text DEFAULT 'manual' NOT NULL,
	"source" text,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeos_reframes_seen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reframe_key" text NOT NULL,
	"shown_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_lifeos_protocol_runs_user_slug" ON "lifeos_protocol_runs" USING btree ("user_id","slug","run_date");--> statement-breakpoint
CREATE INDEX "idx_lifeos_protocol_runs_user_date" ON "lifeos_protocol_runs" USING btree ("user_id","run_date");--> statement-breakpoint
CREATE INDEX "idx_lifeos_confidence_user_created" ON "lifeos_confidence_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_lifeos_reframes_seen_user_key" ON "lifeos_reframes_seen" USING btree ("user_id","reframe_key");--> statement-breakpoint
CREATE INDEX "idx_lifeos_reframes_seen_user_shown" ON "lifeos_reframes_seen" USING btree ("user_id","shown_at");