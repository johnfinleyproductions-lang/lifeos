import { z } from "zod";

/**
 * Morning manifesto schema — written into `lifeos_daily_checkins.morning` jsonb.
 *
 * Stored as JSON (not a typed column) so we can evolve the prompt set
 * across phases without DDL churn. Validated at the API layer.
 */
export const morningManifestoSchema = z.object({
  energy: z.number().int().min(1).max(5),
  mood: z.string().min(1).max(60),
  manifesto: z.string().min(1).max(280),
  priorities: z
    .array(z.string().min(1).max(140))
    .min(1)
    .max(3),
  protect: z.string().min(1).max(200),
  gratitude: z.string().min(1).max(200),
});

export type MorningManifesto = z.infer<typeof morningManifestoSchema>;
