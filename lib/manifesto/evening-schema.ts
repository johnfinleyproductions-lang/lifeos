import { z } from "zod";

/**
 * Evening shutdown schema — written into `lifeos_daily_checkins.evening` jsonb.
 *
 * Mirrors the morning schema in shape (validate-at-API-layer, no DDL coupling)
 * but the prompts are reflective rather than intentional.
 *
 * Rating, mood, the strike-through of the morning's three and the win are
 * asked at every depth. The lesson and tomorrow's seed belong to the Full
 * evening (Quick offers the seed as an optional line under the win); a row
 * omits what was never written, and on read those default to "" so every
 * consumer keeps a plain string.
 *
 * `prioritiesDone` is index-aligned with the morning row's `priorities` array,
 * so we can render checkmarks back to the user later. If they did the evening
 * shutdown without having done the morning manifesto, the field is omitted.
 *
 * `reframe` and `release` were the old Deep mode's two extra cards. Rows
 * imported from v3 still carry them, and the Today summary still prints
 * them, so they stay readable here; the wizard no longer asks them.
 */
export const eveningShutdownSchema = z.object({
  dayRating: z.number().int().min(1).max(5),
  dayMood: z.string().min(1).max(60),
  prioritiesDone: z.array(z.boolean()).max(3).optional(),
  win: z.string().min(1).max(280),
  lesson: z.string().max(280).default(""),
  tomorrowSeed: z.string().max(200).default(""),
  reframe: z.string().min(1).max(280).optional(),
  release: z.string().min(1).max(280).optional(),
});

export type EveningShutdown = z.infer<typeof eveningShutdownSchema>;

/** What the wizard POSTs: the shutdown plus the depth it was written at. */
export const eveningRequestSchema = eveningShutdownSchema.extend({
  depth: z.enum(["quick", "full"]).default("full"),
  /** Set only when a kept offline write is replayed. See lib/offline. */
  writtenAt: z.string().max(40).optional(),
});

export type EveningRequest = z.infer<typeof eveningRequestSchema>;

/** Drop the fields that were never written, so the row stays honest. */
export function compactEvening(e: EveningShutdown): Record<string, unknown> {
  const out: Record<string, unknown> = {
    dayRating: e.dayRating,
    dayMood: e.dayMood,
    win: e.win,
  };
  if (e.prioritiesDone) out.prioritiesDone = e.prioritiesDone;
  if (e.lesson.trim()) out.lesson = e.lesson;
  if (e.tomorrowSeed.trim()) out.tomorrowSeed = e.tomorrowSeed;
  if (e.reframe) out.reframe = e.reframe;
  if (e.release) out.release = e.release;
  return out;
}
