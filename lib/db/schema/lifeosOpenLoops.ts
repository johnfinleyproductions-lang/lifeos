import { table, id, owner, ref, text, timestamp } from "../table";

/**
 * Open loops — unresolved questions surfaced from journal entries.
 *
 * ⚠️  ISOLATION RULE: same as lifeosJournalEntries. Open loops never appear
 * on Today, never feed the AI Coach, never count toward Discipline.
 *
 * Deleting a journal entry deletes its open loops. NoCodeBackend has no
 * foreign keys, so that cascade is declared in lib/db/index.ts.
 * Phase 4.5 ships the schema; UI for browsing/resolving comes later.
 */
export const lifeosOpenLoops = table(
  "lifeos_open_loops",
  {
    id: id(),
    userId: owner().notNull(),
    sourceEntryId: ref("source_entry_id"),
    question: text("question").notNull(),
    status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'archived'
    openedAt: timestamp("opened_at")
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    resolutionNote: text("resolution_note"),
  });

export type LifeosOpenLoop = typeof lifeosOpenLoops.$inferSelect;
export type NewLifeosOpenLoop = typeof lifeosOpenLoops.$inferInsert;
