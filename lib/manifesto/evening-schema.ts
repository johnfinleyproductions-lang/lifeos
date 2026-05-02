import { z } from "zod";

/**
 * Evening shutdown schema — written into `lifeos_daily_checkins.evening` jsonb.
 *
 * Mirrors the morning schema in shape (validate-at-API-layer, no DDL coupling)
 * but the prompts are reflective rather than intentional.
 *
 * Standard mode = 5 steps. Deep mode adds reframe + release as optional
 * fields the wizard surfaces in steps 6 and 7.
 *
 * `prioritiesDone` is index-aligned with the morning row's `priorities` array,
 * so we can render checkmarks back to the user later. If they did the evening
 * shutdown without having done the morning manifesto, the field is omitted.
 */
export const eveningShutdownSchema = z.object({
  dayRating: z.number().int().min(1).max(5),
  dayMood: z.string().min(1).max(60),
  prioritiesDone: z.array(z.boolean()).max(3).optional(),
  win: z.string().min(1).max(280),
  lesson: z.string().min(1).max(280),
  tomorrowSeed: z.string().min(1).max(200),
  // Deep mode optional fields:
  reframe: z.string().min(1).max(280).optional(),
  release: z.string().min(1).max(280).optional(),
});

export type EveningShutdown = z.infer<typeof eveningShutdownSchema>;
