import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { lifeosJournalEntries } from "./lifeosJournalEntries";

/**
 * Open loops — unresolved questions surfaced from journal entries.
 *
 * ⚠️  ISOLATION RULE: same as lifeosJournalEntries. Open loops never appear
 * on Today, never feed the AI Coach, never count toward Discipline.
 *
 * Hard FK to journal entries with cascade delete (LifeOS owns both tables).
 * Phase 4.5 ships the schema; UI for browsing/resolving comes later.
 */
export const lifeosOpenLoops = pgTable(
  "lifeos_open_loops",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    sourceEntryId: uuid("source_entry_id").references(
      () => lifeosJournalEntries.id,
      { onDelete: "cascade" },
    ),
    question: text("question").notNull(),
    status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'archived'
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (table) => ({
    userStatusIdx: index("idx_lifeos_open_loops_user_status").on(
      table.userId,
      table.status,
    ),
  }),
);

export type LifeosOpenLoop = typeof lifeosOpenLoops.$inferSelect;
export type NewLifeosOpenLoop = typeof lifeosOpenLoops.$inferInsert;
