import { z } from "zod";
import { LENGTHS, OUTCOMES, REASONS } from "./rules";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const startExperimentSchema = z
  .object({
    action: z.string().trim().min(3).max(200),
    curiosity: z.string().trim().max(280).optional(),
    cadence: z.string().regex(/^(daily|weekdays|x[1-6])$/).default("daily"),
    lengthDays: z.number().int().refine((n) => (LENGTHS as readonly number[]).includes(n)),
    /** The experiment this one follows on from, when it is a changed re-run. */
    previousId: z.string().regex(/^\d+$/).optional(),
  })
  // A number of times a week only means something over whole weeks.
  .refine((v) => !v.cadence.startsWith("x") || v.lengthDays % 7 === 0, {
    message: "A times-a-week experiment runs for whole weeks.",
    path: ["lengthDays"],
  });

export const markDaySchema = z.object({
  day: day.optional(),
  done: z.boolean(),
  note: z.string().trim().max(400).optional(),
  reason: z.enum(REASONS).nullable().optional(),
});

export const closeExperimentSchema = z.object({
  outcome: z.enum(OUTCOMES),
  worked: z.string().trim().max(600).optional(),
  didNot: z.string().trim().max(600).optional(),
  nextStep: z.string().trim().max(600).optional(),
});
