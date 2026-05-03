import { z } from "zod";

export const futurePathsSchema = z.object({
  oneYear: z.string().max(2000).optional(),
  threeYear: z.string().max(2000).optional(),
  fiveYear: z.string().max(2000).optional(),
  tenYear: z.string().max(2000).optional(),
});
export type FuturePaths = z.infer<typeof futurePathsSchema>;

export const idealWeekSchema = z.object({
  monday: z.string().max(2000).optional(),
  tuesday: z.string().max(2000).optional(),
  wednesday: z.string().max(2000).optional(),
  thursday: z.string().max(2000).optional(),
  friday: z.string().max(2000).optional(),
  saturday: z.string().max(2000).optional(),
  sunday: z.string().max(2000).optional(),
});
export type IdealWeek = z.infer<typeof idealWeekSchema>;

export const upsertCompassSchema = z.object({
  mission: z.string().max(2000).optional(),
  eulogy: z.string().max(4000).optional(),
  successDefinition: z.string().max(2000).optional(),
  futurePaths: futurePathsSchema.optional(),
  idealWeek: idealWeekSchema.optional(),
});

export type UpsertCompassInput = z.infer<typeof upsertCompassSchema>;

export const DAYS: (keyof IdealWeek)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<keyof IdealWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
