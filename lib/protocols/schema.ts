import { z } from "zod";

export const protocolRunSchema = z.object({
  payload: z.record(z.string(), z.string()),
  durationSeconds: z.number().int().min(0).max(7200).optional(),
});

export type ProtocolRunInput = z.infer<typeof protocolRunSchema>;
