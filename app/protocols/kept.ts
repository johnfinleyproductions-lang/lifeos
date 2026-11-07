/**
 * The six protocols that remain, and where the three retired ones went.
 *
 * Nine was three too many: Gratitude duplicated the morning's fifth
 * prompt, Sunday Alignment duplicated the weekly review, and Daily
 * Confidence duplicated the evening's win. Their definitions stay in
 * lib/protocols/definitions.ts, because stored runs still carry their
 * slugs and need their prompt labels to read back; only the list of
 * what can be started is trimmed here.
 *
 * Daily Confidence's side effect, filing its first answer into the
 * confidence file, is kept by filing the evening win there instead
 * (see app/identity/confidence-sync.ts).
 */
export const KEPT_PROTOCOL_SLUGS = [
  "inner_audit",
  "brain_dump",
  "loop_breaker",
  "future_letter",
  "habit_architecture",
  "deep_reflection",
] as const;

export type KeptProtocolSlug = (typeof KEPT_PROTOCOL_SLUGS)[number];

export const KEPT_PROTOCOL_SET: ReadonlySet<string> = new Set(
  KEPT_PROTOCOL_SLUGS,
);

/** Where a retired protocol's route sends you: the thing that replaced it. */
export const RETIRED_PROTOCOL_ROUTES: Record<string, string> = {
  gratitude: "/morning",
  sunday_alignment: "/weekly-review",
  daily_confidence: "/evening",
};
