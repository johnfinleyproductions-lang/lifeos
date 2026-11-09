/**
 * The arithmetic of an experiment: which days it covers, which of them were
 * due, and what the record says so far.
 *
 * Nothing here reads the clock, the database or the framework. Days are
 * "YYYY-MM-DD" keys in the household's zone, worked out by the caller, so
 * the checks can run this file under bare node.
 */

export type DayKey = string;

export type Cadence = "daily" | "weekdays" | `x${1 | 2 | 3 | 4 | 5 | 6}`;

/** Lengths offered when starting one, in days. */
export const LENGTHS = [5, 7, 10, 14, 21, 28] as const;

/** How many can run at once. More than this and none of them gets attention. */
export const MAX_RUNNING = 2;

export const REASONS = ["head", "heart", "hand"] as const;
export type Reason = (typeof REASONS)[number];

export function asCadence(value: string): Cadence {
  if (value === "weekdays") return "weekdays";
  if (/^x[1-6]$/.test(value)) return value as Cadence;
  return "daily";
}

/** Times a week for an 'xN' cadence, otherwise null. */
export function timesPerWeek(cadence: string): number | null {
  const c = asCadence(cadence);
  return c.startsWith("x") ? Number(c.slice(1)) : null;
}

function toUtc(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  return new Date(toUtc(key) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

const isWeekend = (key: DayKey) => {
  const d = new Date(toUtc(key)).getUTCDay();
  return d === 0 || d === 6;
};

/** The last day the experiment covers. */
export function lastDay(start: DayKey, lengthDays: number): DayKey {
  return addDays(start, lengthDays - 1);
}

/** Every calendar day the experiment covers, oldest first. */
export function allDays(start: DayKey, lengthDays: number): DayKey[] {
  return Array.from({ length: lengthDays }, (_, i) => addDays(start, i));
}

/**
 * The days it was meant to happen on. For a times-a-week cadence that is
 * every day: any of them will do, and the count is what matters.
 */
export function dueDays(start: DayKey, lengthDays: number, cadence: string): DayKey[] {
  const days = allDays(start, lengthDays);
  return asCadence(cadence) === "weekdays" ? days.filter((d) => !isWeekend(d)) : days;
}

export type Phase = "running" | "ready" | "closed";

/** Where an experiment stands today. "ready" is past its last day, not yet closed. */
export function phaseOf(
  exp: { status: string; startDate: DayKey; lengthDays: number },
  today: DayKey,
): Phase {
  if (exp.status === "closed") return "closed";
  return today > lastDay(exp.startDate, exp.lengthDays) ? "ready" : "running";
}

/** 1 on the first day. Capped at the length once it is over. */
export function dayNumber(start: DayKey, lengthDays: number, today: DayKey): number {
  return Math.max(1, Math.min(lengthDays, daysBetween(start, today) + 1));
}

/** A mark may be made for today, or for yesterday if last night got away. */
export function canMark(
  exp: { status: string; startDate: DayKey; lengthDays: number },
  day: DayKey,
  today: DayKey,
): boolean {
  if (exp.status === "closed") return false;
  if (day !== today && day !== addDays(today, -1)) return false;
  return day >= exp.startDate && day <= lastDay(exp.startDate, exp.lengthDays);
}

export type Mark = { done: boolean; reason?: string | null };

export type Tally = {
  /** times it was done */
  done: number;
  /** occasions it was meant to happen over the whole run */
  planned: number;
  /** due days marked "not today" (never counted for a times-a-week cadence) */
  missed: number;
  /** due days already past with no mark at all */
  unmarked: number;
  /** how often each reason was given on a day it was not done */
  reasons: Record<Reason, number>;
};

/**
 * What the record says. `through` is the last day to count, normally today
 * while it runs and the last day once it is over.
 */
export function tally(
  exp: { startDate: DayKey; lengthDays: number; cadence: string },
  marks: Map<DayKey, Mark>,
  through: DayKey,
): Tally {
  const per = timesPerWeek(exp.cadence);
  const due = dueDays(exp.startDate, exp.lengthDays, exp.cadence);
  const reasons: Record<Reason, number> = { head: 0, heart: 0, hand: 0 };
  let done = 0;
  let missed = 0;
  let unmarked = 0;
  for (const day of due) {
    const mark = marks.get(day);
    if (mark?.done) {
      done++;
      continue;
    }
    if (mark && !mark.done) {
      if (per === null) missed++;
      if (mark.reason === "head" || mark.reason === "heart" || mark.reason === "hand") {
        reasons[mark.reason]++;
      }
      continue;
    }
    if (per === null && day < through) unmarked++;
  }
  const planned = per === null ? due.length : Math.round((per * exp.lengthDays) / 7);
  return { done, planned, missed, unmarked, reasons };
}

/** "10 days", "2 weeks". Whole weeks read as weeks. */
export function lengthWords(lengthDays: number): string {
  if (lengthDays % 7 === 0) {
    const weeks = lengthDays / 7;
    return weeks === 1 ? "one week" : `${weeks} weeks`;
  }
  return `${lengthDays} days`;
}

export function cadenceWords(cadence: string): string {
  const c = asCadence(cadence);
  if (c === "daily") return "every day";
  if (c === "weekdays") return "on weekdays";
  const n = Number(c.slice(1));
  return n === 1 ? "once a week" : n === 2 ? "twice a week" : `${n} times a week`;
}

/** The sentence, as it prints: "I will walk before work every day for 10 days." */
export function sentence(exp: { action: string; cadence: string; lengthDays: number }): string {
  const action = exp.action.trim().replace(/[.!\s]+$/, "");
  const how = asCadence(exp.cadence) === "daily" ? "" : ` ${cadenceWords(exp.cadence)}`;
  return `I will ${action}${how} for ${lengthWords(exp.lengthDays)}.`;
}

/** The line the tally prints as. Never a percentage: a count nobody can argue with. */
export function tallyWords(t: Tally, cadence: string): string {
  const per = timesPerWeek(cadence);
  if (per !== null) {
    return `Done ${t.done} ${t.done === 1 ? "time" : "times"}, of ${t.planned} planned.`;
  }
  return `Done on ${t.done} of ${t.planned} ${t.planned === 1 ? "day" : "days"}.`;
}

export const REASON_WORDS: Record<Reason, string> = {
  head: "not sure it was worth doing",
  heart: "did not feel like it",
  hand: "something practical got in the way",
};

/** The most common reason for not doing it, if one stands out. */
export function mainReason(t: Tally): Reason | null {
  const ranked = (Object.entries(t.reasons) as [Reason, number][]).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0 || ranked[0][1] === ranked[1][1]) return null;
  return ranked[0][0];
}

/** How an ended experiment is labelled on the shelf. */
export const OUTCOMES = ["again", "habit", "paused", "changed"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_WORDS: Record<Outcome, string> = {
  again: "Kept going",
  habit: "Kept, now a habit",
  paused: "Paused",
  changed: "Changed, ran again",
};
