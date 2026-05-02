import { z } from "zod";

export const startFocusSchema = z.object({
  label: z.string().min(1).max(120),
});

export const stopFocusSchema = z.object({
  note: z.string().max(280).optional(),
});

export type StartFocusInput = z.infer<typeof startFocusSchema>;
export type StopFocusInput = z.infer<typeof stopFocusSchema>;
