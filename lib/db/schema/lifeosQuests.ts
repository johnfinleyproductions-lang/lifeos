import { table, id, owner, text, integer, boolean, date, timestamp } from "../table";

/**
 * Quarterly Quests (Ali Abdaal LifeOS framework).
 *
 * Each user picks 1 Main + up to 3 Side quests in each of two domains
 * (Work, Life), giving a max of 8 active quests per quarter. We don't
 * enforce that limit in the DB — application layer can warn at create
 * time if needed. Better to let the user be flexible than block them.
 *
 * `quarter` is text in `YYYYQN` format (e.g. `2026Q2`). Easier to compare
 * lexicographically than a real interval; matches how humans reason about
 * quarters.
 *
 * Lifecycle:
 *   - status='active' → in flight, progress 0-100
 *   - status='completed' → progress should be 100, end_date set
 *   - status='paused' → carried forward, not actively worked on
 *   - status='abandoned' → dropped intentionally; surfaces in Year Review
 *   - archived=true → hidden from default views (post-quarter cleanup)
 */
export const lifeosQuests = table(
  "lifeos_quests",
  {
    id: id(),
    userId: owner().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    domain: text("domain").notNull(), // 'work' | 'life'
    type: text("type").notNull(), // 'main' | 'side'
    quarter: text("quarter").notNull(), // 'YYYYQN'
    startDate: date("start_date"),
    endDate: date("end_date"),
    progress: integer("progress").notNull().default(0),
    status: text("status").notNull().default("active"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosQuest = typeof lifeosQuests.$inferSelect;
export type NewLifeosQuest = typeof lifeosQuests.$inferInsert;
