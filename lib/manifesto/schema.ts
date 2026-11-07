import { z } from "zod";

/**
 * Morning manifesto schema — written into `lifeos_daily_checkins.morning` jsonb.
 *
 * Stored as JSON (not a typed column) so we can evolve the prompt set
 * across phases without DDL churn. Validated at the API layer.
 *
 * Energy, mood and the priorities are asked at every depth. The manifesto,
 * the protected block and the gratitude line belong to the Full morning;
 * a Quick morning never asks them, and the row omits them. On read they
 * default to "" so every consumer keeps a plain string (the Today cards,
 * the identity page and the coach context all read these fields).
 */
export const morningManifestoSchema = z.object({
  energy: z.number().int().min(1).max(5),
  mood: z.string().min(1).max(60),
  manifesto: z.string().max(280).default(""),
  priorities: z
    .array(z.string().min(1).max(140))
    .min(1)
    .max(3),
  protect: z.string().max(200).default(""),
  gratitude: z.string().max(200).default(""),
});

export type MorningManifesto = z.infer<typeof morningManifestoSchema>;

/**
 * What the wizard POSTs: the manifesto plus the depth it was written at.
 * The depth is stored on the row (`ritual_depth`), not inside the jsonb.
 */
export const morningRequestSchema = morningManifestoSchema.extend({
  depth: z.enum(["quick", "full"]).default("full"),
});

export type MorningRequest = z.infer<typeof morningRequestSchema>;

/** Drop the fields a Quick morning never asked, so the row stays honest. */
export function compactMorning(m: MorningManifesto): Record<string, unknown> {
  const out: Record<string, unknown> = {
    energy: m.energy,
    mood: m.mood,
    priorities: m.priorities,
  };
  if (m.manifesto.trim()) out.manifesto = m.manifesto;
  if (m.protect.trim()) out.protect = m.protect;
  if (m.gratitude.trim()) out.gratitude = m.gratitude;
  return out;
}
