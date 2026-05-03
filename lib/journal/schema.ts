import { z } from "zod";

export const journalModeSchema = z.enum([
  "stream",
  "framework",
  "conversation",
]);
export type JournalMode = z.infer<typeof journalModeSchema>;

export const decisionCategorySchema = z.enum([
  "career",
  "business",
  "relationships",
  "finances",
  "personal_dev",
  "lifestyle",
]);
export type DecisionCategory = z.infer<typeof decisionCategorySchema>;

export const decisionDoorSchema = z.enum(["one_way", "two_way"]);
export type DecisionDoor = z.infer<typeof decisionDoorSchema>;

export const createJournalEntrySchema = z.object({
  mode: journalModeSchema,
  body: z.string().min(1).max(20000),
  frameworkLens: z.string().max(80).optional(),
  isDecision: z.boolean().optional(),
  decisionSummary: z.string().max(280).optional(),
  decisionCategory: decisionCategorySchema.optional(),
  decisionDoor: decisionDoorSchema.optional(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const updateJournalEntrySchema = createJournalEntrySchema.partial();

export type CreateJournalEntryInput = z.infer<
  typeof createJournalEntrySchema
>;
export type UpdateJournalEntryInput = z.infer<
  typeof updateJournalEntrySchema
>;

export const DECISION_CATEGORY_LABELS: Record<DecisionCategory, string> = {
  career: "Career",
  business: "Business",
  relationships: "Relationships",
  finances: "Finances",
  personal_dev: "Personal Dev",
  lifestyle: "Lifestyle",
};
