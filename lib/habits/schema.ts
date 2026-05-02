import { z } from "zod";

export const habitCadenceSchema = z.enum(["daily", "weekdays", "weekly"]);
export type HabitCadence = z.infer<typeof habitCadenceSchema>;

export const createHabitSchema = z.object({
  name: z.string().min(1).max(80),
  cadence: habitCadenceSchema.default("daily"),
  description: z.string().max(280).optional(),
  stackAnchor: z.string().max(120).optional(),
  reward: z.string().max(120).optional(),
  protection: z.string().max(280).optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
