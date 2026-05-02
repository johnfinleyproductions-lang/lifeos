/**
 * Default ritual depth — persisted to localStorage.
 *
 * Phase 2 stores this client-side only. The morning/evening wizards don't
 * yet read from this on mount (Phase 5 will wire that), but the Settings
 * toggle persists the user's intent so it's there when the wiring lands.
 *
 * Why localStorage instead of a DB column: avoids a schema migration for
 * a single user-pref toggle, and is fine for single-user / single-device
 * use. Phase 5 may move this to a `lifeos_user_settings` table once we
 * have multiple personalization toggles to coalesce.
 */
export type RitualDepth = "quick" | "standard" | "deep";

const KEY = "lifeos.ritualDepth";

export function getRitualDepthDefault(): RitualDepth {
  if (typeof window === "undefined") return "standard";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "quick" || stored === "deep") return stored;
  return "standard";
}

export function setRitualDepthDefault(depth: RitualDepth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, depth);
}
