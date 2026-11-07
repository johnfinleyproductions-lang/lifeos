/**
 * Quarter-based time helpers — Ali Abdaal's 90-day Cycle framework.
 *
 * Phases mark where you are in the quarter so the UI can adjust prompts:
 *   Launch (~day 1-9):  set the quests, design the runway
 *   Build  (~day 10-27): foundational work, momentum forming
 *   Grind  (~day 28-63): the long middle, where most of the doing happens
 *   Sprint (~day 64-81): closing pushes, ship the things
 *   Review (~day 82-end): reflect, gather lessons, prep next quarter
 *
 * Everything here is calendar arithmetic on day keys from lib/time/day, not
 * millisecond arithmetic on Dates. The previous version divided elapsed
 * milliseconds by 86,400,000, which on a server in a DST zone made Q1 one
 * day short (the quarter loses an hour in March) and put the day number off
 * by one for an hour around midnight after each transition.
 */
import {
  addDays,
  daysBetween,
  makeDayKey,
  parseDayKey,
  todayKey,
  type DayKey,
} from "@/lib/time/day";

export function currentQuarter(day: DayKey = todayKey()): string {
  const { year, month } = parseDayKey(day);
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}Q${q}`;
}

export type QuarterPhase = "Launch" | "Build" | "Grind" | "Sprint" | "Review";

export type QuarterProgress = {
  quarter: string;
  day: number;
  totalDays: number;
  pct: number;
  phase: QuarterPhase;
};

export function quarterProgress(day: DayKey = todayKey()): QuarterProgress {
  const { year, month } = parseDayKey(day);
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarterStart = makeDayKey(year, quarterStartMonth, 1);
  // The first day of the next quarter, minus one, is the last day of this
  // one. Rolls into January correctly via addDays.
  const nextQuarterStart =
    quarterStartMonth === 10
      ? makeDayKey(year + 1, 1, 1)
      : makeDayKey(year, quarterStartMonth + 3, 1);
  const quarterEnd = addDays(nextQuarterStart, -1);

  const dayNumber = daysBetween(quarterStart, day) + 1;
  const totalDays = daysBetween(quarterStart, quarterEnd) + 1;
  const pct = dayNumber / totalDays;

  let phase: QuarterPhase = "Launch";
  if (pct > 0.1 && pct <= 0.3) phase = "Build";
  else if (pct > 0.3 && pct <= 0.7) phase = "Grind";
  else if (pct > 0.7 && pct <= 0.9) phase = "Sprint";
  else if (pct > 0.9) phase = "Review";

  return {
    quarter: currentQuarter(day),
    day: dayNumber,
    totalDays,
    pct,
    phase,
  };
}
