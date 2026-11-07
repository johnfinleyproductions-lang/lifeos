import { addDays, daysBetween, weekdayOf, type DayKey } from "@/lib/time/day";

const isWeekendKey = (k: DayKey) => {
  const d = weekdayOf(k);
  return d === 0 || d === 6;
};

/** Monday of the ISO week this key falls in. */
const startOfISOWeekKey = (k: DayKey) => addDays(k, -((weekdayOf(k) + 6) % 7));

/**
 * The specimen label for a habit: how many times it has been pressed,
 * when the first one was, and the longest run it has ever had.
 *
 * The current run is deliberately not here. A number that resets to
 * zero the morning after a missed day is the one mechanic in habit apps
 * that turns a quiet record into a penalty. The longest run is a
 * high-water mark: it never goes down, and a week away leaves it where
 * it was.
 *
 * A run is counted in the habit's own cadence. A daily habit runs on
 * consecutive days; a weekdays habit on consecutive weekdays, so Friday
 * to Monday is unbroken and a Saturday pressing neither helps nor
 * hurts; a weekly habit on consecutive ISO weeks.
 */
export type Pressings = {
  count: number;
  /** yyyy-MM-dd of the first pressing, or null */
  first: string | null;
  longestRun: number;
  runUnit: "days" | "weeks";
};

export function pressingsFor(
  dates: string[],
  cadence: string,
): Pressings {
  const unique = [...new Set(dates)].sort();
  const count = dates.length;
  const first = unique[0] ?? null;

  if (cadence === "weekly") {
    const weeks = [
      ...new Set(
        unique.map(startOfISOWeekKey),
      ),
    ].sort();
    return {
      count,
      first,
      longestRun: longestRunBy(weeks, (a, b) => daysBetween(a, b) === 7),
      runUnit: "weeks",
    };
  }

  if (cadence === "weekdays") {
    const weekdays = unique.filter((d) => !isWeekendKey(d));
    return {
      count,
      first,
      longestRun: longestRunBy(weekdays, (a, b) => {
        let next = addDays(a, 1);
        while (isWeekendKey(next)) next = addDays(next, 1);
        return next === b;
      }),
      runUnit: "days",
    };
  }

  return {
    count,
    first,
    longestRun: longestRunBy(unique, (a, b) => daysBetween(a, b) === 1),
    runUnit: "days",
  };
}

function longestRunBy(
  sorted: DayKey[],
  adjacent: (a: DayKey, b: DayKey) => boolean,
): number {
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (adjacent(sorted[i - 1], sorted[i])) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
