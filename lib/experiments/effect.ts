/**
 * Did the experiment change how the days felt?
 *
 * Two honest comparisons of the evening rating (1 to 5), each with a
 * bootstrap range (lib/stats/evidence):
 *
 *   before   the rated evenings inside the run against the same stretch
 *            just before it started (at least a week, at most four)
 *   done     inside the run, evenings on days it was done against days
 *            it was not (only when both kinds of day exist)
 *
 * Neither is proof. A before-and-after can be moved by anything else that
 * changed that month, and the days it got done may simply have been the
 * easier days. So the words never say "caused", a range that crosses zero
 * is "too close to call", and too few rated evenings says so and stops.
 *
 * Those two traps have names in Vaughan, Data Science: The Hard Parts, ch. 15
 * (pp. 197-216): a confounder (the month itself) and self-selection (doing
 * it on the days that were going well anyway). Only a randomised trial
 * removes them, and a person's own fortnight is not one, so the evidence
 * is printed as a lead.
 *
 * Pure: day keys and maps in, sentences out. Nothing reads the clock.
 */
import { differenceRange, signed, verdictOf, type Range } from "@/lib/stats/evidence";
import { addDays, allDays, lastDay, timesPerWeek, type DayKey, type Mark } from "./rules";

/** Fewest rated evenings on each side before a comparison is printed. */
export const MIN_RATED = 4;

export type Comparison = {
  kind: "before" | "done";
  withIt: number[];
  without: number[];
  range: Range | null;
  sentence: string;
};

export type Effect = {
  comparisons: Comparison[];
  /** The caution printed under any comparison that points one way. */
  caution: string | null;
};

const avg = (xs: number[]) => (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1);

function rated(days: DayKey[], ratings: Map<DayKey, number>): number[] {
  return days.flatMap((d) => (ratings.has(d) ? [ratings.get(d)!] : []));
}

function rangeWords(r: Range): string {
  return `${signed(r.low)} to ${signed(r.high)}`;
}

function shortOf(withN: number, withoutN: number, a: string, b: string): string {
  return `Not enough rated evenings to tell yet: ${withN} ${a} and ${withoutN} ${b}. It needs ${MIN_RATED} of each.`;
}

/**
 * The evidence so far. `through` is the last day to count: today while it
 * runs, the last day once it is over.
 */
export function effectOf(
  exp: { startDate: DayKey; lengthDays: number; cadence: string },
  marks: Map<DayKey, Mark>,
  ratings: Map<DayKey, number>,
  through: DayKey,
): Effect {
  const end = lastDay(exp.startDate, exp.lengthDays);
  const last = through < end ? through : end;
  const runDays = allDays(exp.startDate, exp.lengthDays).filter((d) => d <= last);
  const baseLen = Math.min(28, Math.max(7, exp.lengthDays));
  const beforeDays = allDays(addDays(exp.startDate, -baseLen), baseLen);
  const comparisons: Comparison[] = [];

  // 1. Against the stretch before it began.
  {
    const withIt = rated(runDays, ratings);
    const without = rated(beforeDays, ratings);
    const span = baseLen % 7 === 0 ? `${baseLen / 7 === 1 ? "week" : `${baseLen / 7} weeks`}` : `${baseLen} days`;
    if (withIt.length < MIN_RATED || without.length < MIN_RATED) {
      comparisons.push({
        kind: "before",
        withIt,
        without,
        range: null,
        sentence: shortOf(withIt.length, without.length, "during the run", `in the ${span} before`),
      });
    } else {
      const range = differenceRange(withIt, without);
      comparisons.push({
        kind: "before",
        withIt,
        without,
        range,
        sentence: `${phrase(range, `during the run`, `in the ${span} before`, withIt, without)}`,
      });
    }
  }

  // 2. Inside the run, days it was done against days it was not. On a
  // times-a-week cadence any day without it is a "not" day; otherwise only
  // a due day marked "not today" counts, so unmarked days stay out.
  {
    const loose = timesPerWeek(exp.cadence) !== null;
    const doneDays = runDays.filter((d) => marks.get(d)?.done);
    const notDays = runDays.filter((d) => {
      const m = marks.get(d);
      return loose ? !m?.done && d < through : m !== undefined && !m.done;
    });
    const withIt = rated(doneDays, ratings);
    const without = rated(notDays, ratings);
    if (withIt.length >= MIN_RATED && without.length >= MIN_RATED) {
      const range = differenceRange(withIt, without);
      comparisons.push({
        kind: "done",
        withIt,
        without,
        range,
        sentence: phrase(range, "on days you did it", "on days you did not", withIt, without),
      });
    }
  }

  const pointsOneWay = comparisons.some((c) => c.range && verdictOf(c.range) !== "unclear");
  return {
    comparisons,
    caution: pointsOneWay
      ? "Other things change in a few weeks too, and easy days are easier to keep promises on. Read it as a lead worth following, not proof."
      : null,
  };
}

function phrase(r: Range, a: string, b: string, withIt: number[], without: number[]): string {
  const head = `Evenings averaged ${avg(withIt)} ${a} (${withIt.length} rated), against ${avg(without)} ${b} (${without.length} rated).`;
  const v = verdictOf(r);
  if (v === "unclear") {
    return `${head} Too close to call: the 90% range runs from ${rangeWords(r)}, and that includes no change at all.`;
  }
  return `${head} That is ${signed(r.estimate)} a night, and the 90% range runs from ${rangeWords(r)}.`;
}
