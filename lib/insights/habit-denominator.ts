import { addDays, dayKeyOf, weekdayOf, type DayKey } from "@/lib/time/day";

/**
 * The honest denominator for a habit.
 *
 * The old scorecard divided completions by (habits x 7): a flat count
 * that ignored each habit's cadence and the day it was created. A kept
 * week with a weekly habit and a weekdays habit read 62%; a habit made
 * this morning and struck this morning read 14%, because the six days
 * before it existed were counted as misses.
 *
 * Here a day is "possible" for a habit only when the habit existed on
 * that day and its cadence asked for it:
 *
 *   daily     every day from creation onward
 *   weekdays  Monday to Friday from creation onward
 *   weekly    one per ISO week; the week counts if any of its days fell
 *             on or after creation and inside the window
 *
 * A weekly habit is a different shape: the unit is the week, so a week
 * is kept if any day in it carries a pressing. Its "possible" is a count
 * of weeks, and its phrasing says so.
 *
 * Everything here is pure calendar arithmetic on day keys. Nothing
 * reads the clock.
 */

export type Cadence = "daily" | "weekdays" | "weekly";

export function cadenceOf(raw: string): Cadence {
  return raw === "weekdays" || raw === "weekly" ? raw : "daily";
}

const isWeekend = (k: DayKey) => {
  const d = weekdayOf(k);
  return d === 0 || d === 6;
};

/** Monday of the ISO week this key falls in. */
export const isoWeekOf = (k: DayKey): DayKey =>
  addDays(k, -((weekdayOf(k) + 6) % 7));

export type HabitTally = {
  cadence: Cadence;
  /** the first day in the window the habit existed */
  since: DayKey | null;
  /** days (or weeks, for weekly) the cadence asked for inside the window */
  possible: number;
  /** of those, how many carried a pressing */
  kept: number;
  /** unit the two numbers are counted in */
  unit: "days" | "weeks";
  /** the window's days with a flag each: due? kept? existed? */
  cells: { date: DayKey; due: boolean; done: boolean; existed: boolean }[];
};

/**
 * Tally one habit over a window of days (oldest first).
 *
 * `createdAt` is the row's timestamptz; it is bucketed to the household
 * day so a habit made at 11pm counts from that day, not the next.
 */
export function tallyHabit(
  days: DayKey[],
  cadenceRaw: string,
  createdAt: Date | DayKey,
  completions: Set<DayKey>,
): HabitTally {
  const cadence = cadenceOf(cadenceRaw);
  const createdKey =
    typeof createdAt === "string" ? createdAt : dayKeyOf(createdAt);

  const cells = days.map((date) => {
    const existed = date >= createdKey;
    const due =
      existed &&
      (cadence === "daily" ||
        (cadence === "weekdays" && !isWeekend(date)) ||
        cadence === "weekly");
    return { date, due, done: completions.has(date), existed };
  });

  const since = cells.find((c) => c.existed)?.date ?? null;

  if (cadence === "weekly") {
    const existing = cells.filter((c) => c.existed);
    // A window of a week or less is one period: the habit asked for one
    // pressing in it, whichever ISO weeks the seven days straddle.
    if (days.length <= 7) {
      return {
        cadence,
        since,
        possible: existing.length > 0 ? 1 : 0,
        kept: existing.some((c) => c.done) ? 1 : 0,
        unit: "weeks",
        cells,
      };
    }
    // Group the existing days by ISO week; a week is kept if any day in
    // it was pressed. A week only partly inside the window still counts
    // as a week: the habit asked for one pressing in it.
    const weeks = new Map<DayKey, boolean>();
    for (const c of cells) {
      if (!c.existed) continue;
      const w = isoWeekOf(c.date);
      weeks.set(w, (weeks.get(w) ?? false) || c.done);
    }
    return {
      cadence,
      since,
      possible: weeks.size,
      kept: [...weeks.values()].filter(Boolean).length,
      unit: "weeks",
      cells,
    };
  }

  const dueCells = cells.filter((c) => c.due);
  return {
    cadence,
    since,
    possible: dueCells.length,
    kept: dueCells.filter((c) => c.done).length,
    unit: "days",
    cells,
  };
}

/**
 * Sum several tallies into one honest pair. Weekly habits are counted in
 * weeks and the rest in days, so the sum is only offered when every
 * habit is counted in the same unit; otherwise the per-habit lines have
 * to speak for themselves and `mixed` says so.
 */
export function sumTallies(tallies: HabitTally[]): {
  kept: number;
  possible: number;
  mixed: boolean;
} {
  const units = new Set(tallies.map((t) => t.unit));
  return {
    kept: tallies.reduce((s, t) => s + t.kept, 0),
    possible: tallies.reduce((s, t) => s + t.possible, 0),
    mixed: units.size > 1,
  };
}

/**
 * The phrasing. A fraction is only an honest summary when the units
 * agree; a kept weekday week reads "5 of 5", a weekly habit reads
 * "1 this week" rather than "1 of 7". The percentage is never offered:
 * where "5 of 5" is true, "100%" adds nothing, and where the units are
 * mixed a percentage would be the old lie in a new coat.
 */
export function phraseTally(t: HabitTally, windowDays: number): string {
  if (t.possible === 0) return "not due yet";
  if (t.unit === "weeks") {
    if (windowDays <= 7) {
      return t.kept > 0 ? `${t.kept} this week` : "not yet this week";
    }
    return `${t.kept} of ${t.possible} weeks`;
  }
  return `${t.kept} of ${t.possible}`;
}

/** The headline for a group of habits over a window. */
export function phraseSum(
  tallies: HabitTally[],
  windowDays: number,
): { value: string; unit?: string; foot: string } {
  if (tallies.length === 0) {
    return { value: "0", foot: "none set up yet" };
  }
  const { kept, possible, mixed } = sumTallies(tallies);
  if (possible === 0) {
    return { value: "0", foot: "nothing due yet" };
  }
  if (!mixed) {
    const unit = tallies[0].unit;
    return {
      value: String(kept),
      unit: `/${possible}`,
      foot:
        unit === "weeks"
          ? windowDays <= 7
            ? kept === possible
              ? "kept this week"
              : "weekly, counted by the week"
            : `of ${possible} weeks asked for`
          : kept === possible
            ? "every one that was due"
            : `of ${possible} that were due`,
    };
  }
  // Mixed units: the daily and weekday ones in days, the weekly ones in
  // weeks. Offer the day-counted sum as the number and name the rest.
  const dayOnes = tallies.filter((t) => t.unit === "days");
  const weekOnes = tallies.filter((t) => t.unit === "weeks");
  const d = sumTallies(dayOnes);
  const w = sumTallies(weekOnes);
  const weeklyNote =
    weekOnes.length === 1
      ? windowDays <= 7
        ? w.kept > 0
          ? "the weekly one kept"
          : "the weekly one not yet"
        : `the weekly one ${w.kept} of ${w.possible} weeks`
      : `${w.kept} of ${w.possible} weekly`;
  return {
    value: String(d.kept),
    unit: `/${d.possible}`,
    foot: `due days, plus ${weeklyNote}`,
  };
}
