import { z } from "zod";

const balanceScore = z.object({
  mind: z.number().int().min(0).max(10),
  body: z.number().int().min(0).max(10),
  work: z.number().int().min(0).max(10),
  relationships: z.number().int().min(0).max(10),
  play: z.number().int().min(0).max(10),
  spirit: z.number().int().min(0).max(10),
});

export const weeklyReviewPayloadSchema = z.object({
  reflect: z.string().max(2000),
  wins: z.string().max(2000),
  questNotes: z.record(z.string(), z.string().max(500)).optional(),
  balance: balanceScore,
  lesson: z.string().max(1000),
  reframe: z.string().max(1000).optional(),
  nextWeekFeel: z.string().max(280),
  nextWeekPriorities: z.array(z.string().min(1).max(140)).max(3),
});

export type WeeklyReviewPayload = z.infer<typeof weeklyReviewPayloadSchema>;
