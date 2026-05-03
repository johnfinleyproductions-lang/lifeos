import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Journal entries — the parallel sanctuary.
 *
 * ⚠️  ISOLATION RULES (spec §2.4) — DO NOT VIOLATE.
 *
 * Code that reads from this table must NEVER appear in:
 *   - lib/coach/* (AI Coach context — Phase 8)
 *   - components/today/* (Today dashboard cards)
 *   - lib/discipline/* (Discipline Scorecard — Phase 6)
 *   - lib/pattern-detector.ts (Insights — Phase 7)
 *
 * The journal is a private writing space. Cross-talk turns it from a
 * sanctuary into a performance surface. Decisions to bridge to Core
 * (e.g. promote to a quest, save to confidence file) must be EXPLICIT
 * USER ACTIONS only — never automatic, never implicit.
 *
 * `mode` distinguishes the three writing styles:
 *   - 'stream'        Cole-style: free-form, "dear universe…"
 *   - 'framework'     Dickie-style: a mental-model lens + structured prompt
 *   - 'conversation'  Future-Me dialogue (alternating speakers in body text)
 *
 * `framework_lens` is set only for mode='framework' (e.g. 'bottleneck_analysis').
 *
 * `is_decision` flips the entry into the Decisions Log. The decision_*
 * fields are filled in when is_decision=true.
 */
export const lifeosJournalEntries = pgTable(
  "lifeos_journal_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    entryDate: date("entry_date").notNull(),
    mode: text("mode").notNull(),
    body: text("body").notNull(),
    frameworkLens: text("framework_lens"),
    isDecision: boolean("is_decision").notNull().default(false),
    decisionSummary: text("decision_summary"),
    decisionCategory: text("decision_category"),
    decisionDoor: text("decision_door"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userDateIdx: index("idx_lifeos_journal_user_date").on(
      table.userId,
      table.entryDate,
    ),
    userDecisionIdx: index("idx_lifeos_journal_decisions").on(
      table.userId,
      table.isDecision,
    ),
    userModeIdx: index("idx_lifeos_journal_mode").on(
      table.userId,
      table.mode,
    ),
  }),
);

export type LifeosJournalEntry = typeof lifeosJournalEntries.$inferSelect;
export type NewLifeosJournalEntry =
  typeof lifeosJournalEntries.$inferInsert;
