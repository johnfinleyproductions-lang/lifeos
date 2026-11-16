/**
 * Runs and weeks: the record read as a time series.
 *
 * A run is an unbroken stretch of kept occasions, counted in the habit's
 * own unit: due days for daily and weekdays habits (a weekdays habit's run
 * steps over the weekend), whole weeks for a weekly one. Days before the
 * habit existed are not misses. Today, while it is still open, does not
 * break a run: "now" counts up to the last occasion that has closed, plus
 * today if it is already kept.
 *
 * The weekly series folds the days into ISO weeks (Monday first) and
 * compares the latest four weeks with the four before them, using the
 * same honest range as the experiments (lib/stats/evidence).
 *
 * Pure: day keys in, numbers and sentences out. Nothing reads the clock.
 */
import { differenceRange, signed, verdictOf, type Range } from "@/lib/stats/evidence";
import { isoWeekOf, type HabitTally } from "./habit-denominator";
import type { DayPoint } from "./queries";

export type Runs = { current: number; longest: number; unit: "days" | "weeks" };

/** The kept/not-kept sequence of closed occasions, oldest first. */
function occasions(t: HabitTally, today: string): boolean[] {
  if (t.unit === "weeks") {
    const weeks = new Map<string, boolean>();
    for (const c of t.cells) {
      if (!c.existed) continue;
      const w = isoWeekOf(c.date);
      weeks.set(w, (weeks.get(w) ?? false) || c.done);
    }
    const thisWeek = isoWeekOf(today);
    return [...weeks.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .filter(([w, kept]) => w < thisWeek || kept)
      .map(([, kept]) => kept);
  }
  return t.cells
    .filter((c) => c.due && (c.date < today || c.done))
    .map((c) => c.done);
}

export function runsOf(t: HabitTally, today: string): Runs {
  const seq = occasions(t, today);
  let longest = 0;
  let run = 0;
  for (const kept of seq) {
    run = kept ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  return { current: run, longest, unit: t.unit };
}

/** "Longest run 9 days, 4 now." Nothing when nothing has been kept yet. */
export function runWords(r: Runs): string | null {
  if (r.longest === 0) return null;
  const u = (n: number) => (r.unit === "weeks" ? (n === 1 ? "week" : "weeks") : n === 1 ? "day" : "days");
  if (r.current === r.longest) return `Run of ${r.current} ${u(r.current)}, its longest.`;
  return `Longest run ${r.longest} ${u(r.longest)}, ${r.current} now.`;
}

export type WeekPoint = {
  /** Monday of the week */
  week: string;
  /** mean evening rating that week, or null with nothing rated */
  rating: number | null;
  rated: number;
  focusMinutes: number;
};

/** Days folded into ISO weeks, oldest first. A partial first or last week is kept. */
export function weeksOf(points: DayPoint[]): WeekPoint[] {
  const by = new Map<string, { sum: number; rated: number; focus: number }>();
  for (const p of points) {
    const w = isoWeekOf(p.date);
    const b = by.get(w) ?? { sum: 0, rated: 0, focus: 0 };
    if (p.eveningRating !== null) {
      b.sum += p.eveningRating;
      b.rated++;
    }
    b.focus += p.focusMinutes;
    by.set(w, b);
  }
  return [...by.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, b]) => ({
      week,
      rating: b.rated ? b.sum / b.rated : null,
      rated: b.rated,
      focusMinutes: b.focus,
    }));
}

/** Fewest rated evenings on each side of the four-week comparison. */
export const MIN_TREND_RATED = 8;

/**
 * The last four weeks against the four before, by evening rating. Null
 * when either side has fewer than MIN_TREND_RATED rated evenings.
 */
export function ratingTrend(points: DayPoint[]): { range: Range; sentence: string } | null {
  if (points.length < 56) return null;
  const recent = points.slice(-28).flatMap((p) => (p.eveningRating === null ? [] : [p.eveningRating]));
  const before = points.slice(-56, -28).flatMap((p) => (p.eveningRating === null ? [] : [p.eveningRating]));
  if (recent.length < MIN_TREND_RATED || before.length < MIN_TREND_RATED) return null;
  const range = differenceRange(recent, before);
  const v = verdictOf(range);
  const where = `${signed(range.low)} to ${signed(range.high)}`;
  const sentence =
    v === "unclear"
      ? `About level: the last four weeks against the four before come out at ${signed(range.estimate)}, and the 90% range (${where}) includes no change.`
      : `Evenings are ${v} ${Math.abs(range.estimate).toFixed(1)} a night on the four weeks before, with a 90% range of ${where}.`;
  return { range, sentence };
}
