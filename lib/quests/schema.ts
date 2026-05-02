import { z } from "zod";

export const questDomainSchema = z.enum(["work", "life"]);
export const questTypeSchema = z.enum(["main", "side"]);
export const questStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "abandoned",
]);

export type QuestDomain = z.infer<typeof questDomainSchema>;
export type QuestType = z.infer<typeof questTypeSchema>;
export type QuestStatus = z.infer<typeof questStatusSchema>;

export const createQuestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  domain: questDomainSchema,
  type: questTypeSchema,
  quarter: z
    .string()
    .regex(/^\d{4}Q[1-4]$/)
    .optional(),
});

export const updateQuestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: questStatusSchema.optional(),
  archived: z.boolean().optional(),
});

export type CreateQuestInput = z.infer<typeof createQuestSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestSchema>;
