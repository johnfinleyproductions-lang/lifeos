/**
 * Ritual depth: how many cards the morning and evening wizards deal.
 *
 * Depth is a per-run choice made on the wizard's first card, not a setting.
 * The last pick is remembered in `lifeos_daily_checkins.ritual_depth`, so
 * the chip you chose yesterday is the one pre-pressed today.
 *
 * Two depths are offered:
 *   quick  three cards, about thirty seconds
 *   full   five cards, the whole ritual
 *
 * The column still carries "standard" and "deep" from earlier builds and
 * from the v3 import. Both read as Full; Full is written back as
 * "standard" so lib/checkin/today.ts and the import schema keep parsing.
 */
export type RitualDepth = "quick" | "standard" | "deep";
export type DepthChoice = "quick" | "full";

export const DEPTH_CHOICES: {
  key: DepthChoice;
  label: string;
  hint: string;
}[] = [
  { key: "quick", label: "Quick", hint: "30 seconds" },
  { key: "full", label: "Full", hint: "5 steps" },
];

export function depthChoiceFromStored(
  stored: string | null | undefined,
): DepthChoice {
  return stored === "quick" ? "quick" : "full";
}

export function storedFromDepthChoice(choice: DepthChoice): RitualDepth {
  return choice === "quick" ? "quick" : "standard";
}
