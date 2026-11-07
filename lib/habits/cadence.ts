import { addDays, weekdayOf, type DayKey } from "@/lib/time/day";

/**
 * How many days a habit was actually due in a window, and how many of
 * those it was kept on.
 *
 * This exists because the app was dividing completions by (habits x 7).
 * Flat. A weekly habit kept perfectly counted as six misses; a weekdays
 * habit counted as two; and a habit created today counted the six days
 * before it existed as failures, so a new habit struck on its first day
 * read 14%. The app deliberately shows a longest run rather than a current
 * one so that a missed day is not a penalty, and then the denominator
 * called a perfect week 62%. Whatever a number here says, it has to be
 * something the person could not reasonably dispute.
 *
 * Weekly habits are counted in weeks, not days, because "1 of the last 7"
 * is a sentence about failure and "kept" is the truth.
 */
export type Cadence = "daily" | "weekdays" | "weekly";

export type Kept = {
  unit: "days" | "weeks";
  /** occasions the habit was actually due, never before it existed */
  expected: number;
  kept: number;
};

export function asCadence(value: string): Cadence {
  return value === "weekdays" || value === "weekly" ? value : "daily";
}

const isWeekend = (k: DayKey) => {
  const d = weekdayOf(k);
  return d === 0 || d === 6;
};

/** Monday of the ISO week this key falls in. */
const isoWeekOf = (k: DayKey) => addDays(k, -((weekdayOf(k) + 6) % 7));

export function keptIn(
  cadence: string,
  /** the day the habit came into existence; occasions before it do not count */
  since: DayKey | null,
  /** the window, oldest first */
  window: DayKey[],
  done: Set<DayKey>,
): Kept {
  const live = since ? window.filter((k) => k >= since) : window;

  if (asCadence(cadence) === "weekly") {
    // Expected is whole weeks of the habit's life inside the window, not
    // the number of ISO weeks the window happens to touch. A rolling seven
    // days almost always straddles two ISO weeks, so counting those made a
    // weekly habit kept exactly on target read "1 of 2 weeks" - punished
    // for where the window fell rather than for anything the person did.
    const expected = live.length === 0 ? 0 : Math.ceil(live.length / 7);
    const keptWeeks = new Set(
      live.filter((k) => done.has(k)).map(isoWeekOf),
    ).size;
    return { unit: "weeks", expected, kept: Math.min(keptWeeks, expected) };
  }

  const due =
    asCadence(cadence) === "weekdays" ? live.filter((k) => !isWeekend(k)) : live;
  return {
    unit: "days",
    expected: due.length,
    kept: due.filter((k) => done.has(k)).length,
  };
}

/**
 * The cadence line under a habit's name. Returns the bare cadence when
 * nothing was due yet, because "0 of 0" is noise and "14%" is a lie.
 */
export function keptLine(cadence: string, k: Kept): string {
  if (k.expected === 0) return cadence;
  if (k.unit === "weeks") {
    if (k.kept >= k.expected) return `${cadence}, kept`;
    return `${cadence}, ${k.kept} of ${k.expected} ${k.expected === 1 ? "week" : "weeks"}`;
  }
  return `${cadence}, ${k.kept} of ${k.expected}`;
}
