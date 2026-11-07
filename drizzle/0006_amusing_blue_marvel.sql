-- Phase 2: the workspace column stops being written.
--
-- Ten routes filled workspace_id on insert and nothing anywhere read it;
-- every read filters on user_id. So the workspace tables are gone rather
-- than ported.
--
-- The column stays, nullable. Existing rows carry a real value, and if
-- LifeOS is ever mounted inside Evergreen again that history is worth
-- more than the few bytes it costs. ALTER COLUMN DROP NOT NULL is
-- already a no-op when repeated; the index drop is guarded to match.

DROP INDEX IF EXISTS "idx_lifeos_checkins_workspace_date";--> statement-breakpoint
ALTER TABLE "lifeos_daily_checkins" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_habits" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_focus_sessions" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_quests" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_compass" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_protocol_runs" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_confidence_entries" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_journal_entries" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lifeos_open_loops" ALTER COLUMN "workspace_id" DROP NOT NULL;
