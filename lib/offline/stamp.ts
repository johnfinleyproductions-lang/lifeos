/**
 * The time a kept write carries, and the time a stored sheet was written.
 * Nothing here touches the network or the framework, so the checks can run
 * it under bare node.
 */

const FUTURE_SLACK_MS = 5 * 60 * 1000;
const OLDEST_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * When a kept write says it was written. Null for a write sent live, and for
 * a time that cannot be right: in the future beyond a clock's drift, or more
 * than sixty days old.
 */
export function writtenAtFrom(value: unknown, now: number = Date.now()): Date | null {
  if (typeof value !== "string") return null;
  const at = new Date(value);
  const ms = at.getTime();
  if (Number.isNaN(ms)) return null;
  if (ms > now + FUTURE_SLACK_MS || ms < now - OLDEST_MS) return null;
  return ms > now ? new Date(now) : at;
}

/** The moment a stored morning or evening sheet was written, if it says. */
export function sheetWrittenAt(sheet: unknown): number {
  const at = (sheet as { _at?: unknown } | null)?._at;
  const ms = typeof at === "string" ? new Date(at).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}
