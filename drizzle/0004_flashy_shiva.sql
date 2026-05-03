CREATE TABLE "lifeos_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"mode" text NOT NULL,
	"body" text NOT NULL,
	"framework_lens" text,
	"is_decision" boolean DEFAULT false NOT NULL,
	"decision_summary" text,
	"decision_category" text,
	"decision_door" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeos_open_loops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_entry_id" uuid,
	"question" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_note" text
);
--> statement-breakpoint
ALTER TABLE "lifeos_open_loops" ADD CONSTRAINT "lifeos_open_loops_source_entry_id_lifeos_journal_entries_id_fk" FOREIGN KEY ("source_entry_id") REFERENCES "public"."lifeos_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lifeos_journal_user_date" ON "lifeos_journal_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_lifeos_journal_decisions" ON "lifeos_journal_entries" USING btree ("user_id","is_decision");--> statement-breakpoint
CREATE INDEX "idx_lifeos_journal_mode" ON "lifeos_journal_entries" USING btree ("user_id","mode");--> statement-breakpoint
CREATE INDEX "idx_lifeos_open_loops_user_status" ON "lifeos_open_loops" USING btree ("user_id","status");