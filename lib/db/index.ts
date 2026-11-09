/**
 * The app's one handle on its data.
 *
 *     import { db } from "@/lib/db";
 *     import { and, eq, desc } from "@/lib/db/ops";
 *
 * Storage is NoCodeBackend. `query.ts` explains how the chained calls are
 * carried out over its REST API, and `transport.ts` what is sent.
 */
import { createDatabase } from "./query";
import {
  lifeosHabitCompletions,
  lifeosHabits,
  lifeosJournalEntries,
  lifeosOpenLoops,
} from "./schema";
import { ncbTransport } from "./transport";

export const db = createDatabase(ncbTransport);

// What used to be ON DELETE CASCADE. NCB has no foreign keys.
db.cascade(lifeosHabits, lifeosHabitCompletions, lifeosHabitCompletions.habitId);
db.cascade(lifeosJournalEntries, lifeosOpenLoops, lifeosOpenLoops.sourceEntryId);

export type DbClient = typeof db;
