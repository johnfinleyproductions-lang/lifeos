CREATE TABLE "lifeos_habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cadence" text DEFAULT 'daily' NOT NULL,
	"description" text,
	"stack_anchor" text,
	"reward" text,
	"protection" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifeos_habit_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"completion_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifeos_habit_completions_habit_date_unique" UNIQUE("habit_id","completion_date")
);
--> statement-breakpoint
CREATE TABLE "lifeos_focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"note" text,
	"quest_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lifeos_habit_completions" ADD CONSTRAINT "lifeos_habit_completions_habit_id_lifeos_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."lifeos_habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lifeos_habits_user_active" ON "lifeos_habits" USING btree ("user_id","archived");--> statement-breakpoint
CREATE INDEX "idx_lifeos_habit_completions_user_date" ON "lifeos_habit_completions" USING btree ("user_id","completion_date");--> statement-breakpoint
CREATE INDEX "idx_lifeos_focus_user_started" ON "lifeos_focus_sessions" USING btree ("user_id","started_at");