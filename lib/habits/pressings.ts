import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  parseISO,
  startOfISOWeek,
} from "date-fns";

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
        unique.map((d) => format(startOfISOWeek(parseISO(d)), "yyyy-MM-dd")),
      ),
    ].sort();
    return {
      count,
      first,
      longestRun: longestRunBy(weeks, (a, b) => differenceInCalendarDays(b, a) === 7),
      runUnit: "weeks",
    };
  }

  if (cadence === "weekdays") {
    const weekdays = unique.filter((d) => !isWeekend(parseISO(d)));
    return {
      count,
      first,
      longestRun: longestRunBy(weekdays, (a, b) => {
        let next = addDays(a, 1);
        while (isWeekend(next)) next = addDays(next, 1);
        return differenceInCalendarDays(b, next) === 0;
      }),
      runUnit: "days",
    };
  }

  return {
    count,
    first,
    longestRun: longestRunBy(
      unique,
      (a, b) => differenceInCalendarDays(b, a) === 1,
    ),
    runUnit: "days",
  };
}

function longestRunBy(
  sorted: string[],
  adjacent: (a: Date, b: Date) => boolean,
): number {
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (adjacent(parseISO(sorted[i - 1]), parseISO(sorted[i]))) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
