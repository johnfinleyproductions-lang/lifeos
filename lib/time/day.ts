/**
 * The household's day.
 *
 * LifeOS is a daily log. Nearly everything it stores is keyed to a calendar
 * day (entry_date, completion_date, run_date), so the app has to agree with
 * the person about which day it is. A container defaults to UTC, and an
 * evening shutdown at 7pm in Chicago is 1am tomorrow in UTC; derived from the
 * server clock, that entry lands on the wrong row.
 *
 * This module is the only place that turns an instant into a calendar day or
 * a calendar day into text. Callers never call `new Date()` for "today",
 * never `toISOString().slice(0, 10)`, never `format(new Date(), ...)`. They
 * ask here. Day keys are plain "YYYY-MM-DD" strings, the same shape Drizzle
 * reads and writes for `date` columns, and all arithmetic on them is pure
 * calendar arithmetic: no instants, so no offsets, so nothing to get wrong
 * twice a year.
 *
 * The zone comes from LIFEOS_TIMEZONE (an IANA name such as America/Chicago).
 * It is checked on first use and at server start (see instrumentation.ts);
 * an invalid value throws rather than quietly becoming UTC. Zone resolution
 * goes through Intl.DateTimeFormat, which carries the tz database inside the
 * runtime's ICU, so DST transitions are the real ones, not a fixed offset.
 *
 * Why not pin the Postgres session timezone instead, or as well? The app
 * never asks SQL for a date. Every `date` column is written from a key this
 * module produced and read back as the same string; timestamptz columns are
 * instants and do not care. Pinning would make two clocks agree by
 * convention. One clock, passed explicitly, cannot disagree with itself.
 * `grep -rn "current_date\|CURRENT_DATE\|now()::date" lib app` should stay
 * empty.
 *
 * Deliberately NOT here: a configurable day-start hour (the 4am rollover).
 * Someone who writes their evening shutdown at 00:30 probably means the day
 * that just ended. That is a real question, and the shape of this module
 * means answering it is a one-function change (shift the instant before it
 * reaches dayKeyOf in todayKey and startOfDay), but it is a product decision
 * about what a day is, not a correctness fix, so it stays flagged rather than
 * built. Midnight in the household zone is the boundary.
 */

export type DayKey = string; // "YYYY-MM-DD"

const ENV_ZONE = "LIFEOS_TIMEZONE";
const DEFAULT_ZONE = "America/Chicago";
const ENV_FAKE_NOW = "LIFEOS_FAKE_NOW";

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// ---------------------------------------------------------------------------
// Zone
// ---------------------------------------------------------------------------

export class TimezoneConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimezoneConfigError";
  }
}

/** True when the runtime's ICU knows the zone. */
export function isValidTimeZone(zone: string): boolean {
  if (!zone || typeof zone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

let resolvedZone: string | null = null;
let announced = false;

/**
 * Resolve LIFEOS_TIMEZONE once. Throws TimezoneConfigError on a bad value.
 *
 * Resolved on first use rather than at import, so `next build` does not
 * read an environment the build does not have and the running container's
 * value is what counts. instrumentation.ts calls this at server start so a
 * bad value stops the process before it serves a single wrong date.
 */
export function householdZone(): string {
  if (resolvedZone) return resolvedZone;

  const raw = process.env[ENV_ZONE]?.trim();
  const zone = raw || DEFAULT_ZONE;

  if (!isValidTimeZone(zone)) {
    throw new TimezoneConfigError(
      `${ENV_ZONE}="${raw}" is not a time zone this runtime knows. ` +
        `Use an IANA name such as America/Chicago or Europe/London. ` +
        `Refusing to start rather than fall back to UTC.`,
    );
  }

  // Keep the canonical spelling ICU reports (e.g. "america/chicago" ->
  // "America/Chicago") so logs and comparisons read cleanly.
  resolvedZone = new Intl.DateTimeFormat("en-US", { timeZone: zone })
    .resolvedOptions().timeZone;

  if (!announced) {
    announced = true;
    console.log(
      `[time] household zone ${resolvedZone} (${raw ? `from ${ENV_ZONE}` : `default; ${ENV_ZONE} unset`})`,
    );
  }
  return resolvedZone;
}

const ENV_DAY_START = "LIFEOS_DAY_START";
const DEFAULT_DAY_START = 4;

let resolvedDayStart: number | null = null;

/**
 * The local hour at which the household's day begins. Default 4.
 *
 * Writing an evening shutdown at 00:30 means the day that just ended, not
 * the one thirty minutes old, and with a midnight boundary that entry
 * landed on tomorrow's sheet. Every other tool in this category either
 * built this early and treats it as trivial (Habitica's custom day start,
 * Rize's 4am default) or never built it and has a years-old open request
 * (Day One, Sunsama, Toggl, Fitbit), where the advice is to edit the
 * entry's date afterwards.
 *
 * 4 is also the safe hour, not merely the conventional one. Chicago's
 * clocks change at 02:00, so 04:00 local exists exactly once on every day
 * of the year: there is no repeated or skipped hour to disambiguate, which
 * is not true of midnight in zones that transition at midnight.
 *
 * 0 restores the plain calendar day.
 */
export function dayStartHour(): number {
  if (resolvedDayStart !== null) return resolvedDayStart;

  const raw = process.env[ENV_DAY_START]?.trim();
  if (!raw) {
    resolvedDayStart = DEFAULT_DAY_START;
    return resolvedDayStart;
  }

  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    throw new TimezoneConfigError(
      `${ENV_DAY_START}="${raw}" is not an hour. Use a whole number from 0 to 23 ` +
        `(4 means the day runs 04:00 to 04:00). Refusing to start rather than ` +
        `file entries under the wrong day.`,
    );
  }
  resolvedDayStart = n;
  return resolvedDayStart;
}

/**
 * True when the real local clock has not yet reached the day start, so the
 * household day is still yesterday's. For copy like "Still Saturday until
 * four" on a wizard opened after midnight.
 */
export function beforeDayStart(instant: Date = now(), zone = householdZone()): boolean {
  return localParts(instant, zone).hour < dayStartHour();
}

/**
 * Validate the configuration and the clock seam. Called from
 * instrumentation.ts at server start; throws on a bad zone.
 */
export function assertTimeConfig(): void {
  householdZone();
  dayStartHour();
  now(); // resolves and announces the fake clock, if any
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

let clockOffsetMs: number | null = null;

/**
 * The current instant.
 *
 * The one seam for testing day boundaries without faketime: when
 * LIFEOS_FAKE_NOW holds an ISO instant, the clock is shifted so that
 * instant is "now" at startup and time keeps moving from there. It is
 * announced loudly on every boot where it is set, because a server left
 * running with a faked clock would be a very confusing bug.
 */
export function now(): Date {
  if (clockOffsetMs === null) {
    const raw = process.env[ENV_FAKE_NOW]?.trim();
    if (raw) {
      const t = Date.parse(raw);
      if (!Number.isFinite(t)) {
        throw new TimezoneConfigError(
          `${ENV_FAKE_NOW}="${raw}" is not an ISO instant (e.g. 2026-11-07T19:00:00-06:00).`,
        );
      }
      clockOffsetMs = t - Date.now();
      console.warn(
        `[time] WARNING: clock is faked. ${ENV_FAKE_NOW}=${raw}; ` +
          `the server believes it is ${new Date(t).toISOString()} right now. ` +
          `Unset ${ENV_FAKE_NOW} for real use.`,
      );
    } else {
      clockOffsetMs = 0;
    }
  }
  return new Date(Date.now() + clockOffsetMs);
}

// ---------------------------------------------------------------------------
// Instant -> zone-local parts
// ---------------------------------------------------------------------------

export type LocalParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday, as Date#getDay
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatterCache.set(zone, f);
  }
  return f;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The wall-clock parts of an instant, in the household zone. */
export function localParts(instant: Date = now(), zone = householdZone()): LocalParts {
  const out: Partial<LocalParts> = {};
  for (const p of partsFormatter(zone).formatToParts(instant)) {
    switch (p.type) {
      case "year":
        out.year = Number(p.value);
        break;
      case "month":
        out.month = Number(p.value);
        break;
      case "day":
        out.day = Number(p.value);
        break;
      case "hour":
        // Some ICU builds print midnight as "24" under hour12:false; h23
        // should prevent it, but a modulo costs nothing.
        out.hour = Number(p.value) % 24;
        break;
      case "minute":
        out.minute = Number(p.value);
        break;
      case "second":
        out.second = Number(p.value);
        break;
      case "weekday":
        out.weekday = WEEKDAY_INDEX[p.value] ?? 0;
        break;
    }
  }
  return out as LocalParts;
}

/** Zone offset in milliseconds at the given instant (positive east of UTC). */
function offsetAt(instant: Date, zone: string): number {
  const p = localParts(instant, zone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Drop sub-second ms: formatToParts has no ms field.
  const whole = instant.getTime() - (instant.getTime() % 1000);
  return asUtc - whole;
}

// ---------------------------------------------------------------------------
// Day keys
// ---------------------------------------------------------------------------

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

export function makeDayKey(year: number, month: number, day: number): DayKey {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Split a key into numbers. Throws on anything that is not YYYY-MM-DD. */
export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const m = DAY_KEY_RE.exec(key);
  if (!m) throw new RangeError(`Not a day key: "${key}"`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === "string" && DAY_KEY_RE.test(value);
}

/**
 * The household day an instant falls on.
 *
 * Shifted by dayStartHour(), so 00:30 belongs to the day that just ended.
 * The shift is applied to the local wall clock and then the key is stepped
 * back a whole day, rather than by subtracting hours from the instant:
 * stepping a key is exact, while subtracting four hours from an instant on
 * the night the clocks change lands an hour out.
 */
export function dayKeyOf(instant: Date, zone = householdZone()): DayKey {
  const p = localParts(instant, zone);
  const key = makeDayKey(p.year, p.month, p.day);
  return p.hour < dayStartHour() ? addDays(key, -1) : key;
}

/** The plain calendar date of an instant, ignoring the day boundary. */
export function calendarDayOf(instant: Date, zone = householdZone()): DayKey {
  const p = localParts(instant, zone);
  return makeDayKey(p.year, p.month, p.day);
}

/** Today, as the household would name it. */
export function todayKey(): DayKey {
  return dayKeyOf(now());
}

/**
 * Calendar arithmetic on keys. Done on a UTC proleptic calendar so a day is
 * always a day: adding 1 to the key for the night the clocks change gives
 * the next key, never the same one twice or a skipped one.
 */
export function addDays(key: DayKey, n: number): DayKey {
  const { year, month, day } = parseDayKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return makeDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Whole calendar days from `a` to `b`; positive when b is later. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const pa = parseDayKey(a);
  const pb = parseDayKey(b);
  const ua = Date.UTC(pa.year, pa.month - 1, pa.day);
  const ub = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((ub - ua) / 86_400_000);
}

/** The last `n` keys ending at `end` (inclusive), oldest first. */
export function lastNDays(n: number, end: DayKey = todayKey()): DayKey[] {
  const out: DayKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

/** 0 = Sunday, as Date#getDay. Pure; does not touch the clock. */
export function weekdayOf(key: DayKey): number {
  const { year, month, day } = parseDayKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 1-based day of the year for the key. */
export function dayOfYear(key: DayKey): number {
  const { year } = parseDayKey(key);
  return daysBetween(makeDayKey(year, 1, 1), key) + 1;
}

// ---------------------------------------------------------------------------
// Day key -> instant
// ---------------------------------------------------------------------------

/**
 * The instant at which `key` begins in the household zone: local
 * dayStartHour(), 04:00 by default.
 *
 * Offsets are sampled a day either side of the target so the night of a
 * transition is covered, and each candidate is checked against the wall
 * clock it produces. On an ordinary day all candidates agree. For a zone
 * whose transition falls at midnight (not Chicago, whose clocks change at
 * 02:00): if midnight happens twice, the earlier one wins; if it does not
 * happen at all, the first instant on that day is returned.
 */
export function startOfDay(key: DayKey, zone = householdZone()): Date {
  const { year, month, day } = parseDayKey(key);
  const startHour = dayStartHour();
  const wall = Date.UTC(year, month - 1, day, startHour, 0, 0);
  const offsets = new Set<number>();
  for (const probe of [wall - 86_400_000, wall, wall + 86_400_000]) {
    offsets.add(offsetAt(new Date(probe), zone));
  }
  let exact: number | null = null;
  let sameDay: number | null = null;
  for (const o of offsets) {
    const t = wall - o;
    const p = localParts(new Date(t), zone);
    const onDay = makeDayKey(p.year, p.month, p.day) === key;
    if (onDay && p.hour === startHour && p.minute === 0) {
      exact = exact === null ? t : Math.min(exact, t);
    } else if (onDay) {
      sameDay = sameDay === null ? t : Math.min(sameDay, t);
    }
  }
  const t = exact ?? sameDay;
  if (t === null) {
    throw new RangeError(`Could not find the start of ${key} in ${zone}`);
  }
  return new Date(t);
}

/** The instant at which the day after `key` begins. */
export function endOfDay(key: DayKey, zone = householdZone()): Date {
  return startOfDay(addDays(key, 1), zone);
}

/** Length of the calendar day in hours: 23, 24 or 25 in Chicago. */
export function hoursInDay(key: DayKey, zone = householdZone()): number {
  return (endOfDay(key, zone).getTime() - startOfDay(key, zone).getTime()) / 3_600_000;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour?: number;
  minute?: number;
};

const TOKEN_RE = /yyyy|MMMM|MMM|MM|dd|d|EEEEEE|EEEE|EEE|HH|h|mm|a/g;

function render(parts: TextParts, pattern: string): string {
  return pattern.replace(TOKEN_RE, (tok) => {
    switch (tok) {
      case "yyyy":
        return pad(parts.year, 4);
      case "MMMM":
        return MONTHS[parts.month - 1];
      case "MMM":
        return MONTHS[parts.month - 1].slice(0, 3);
      case "MM":
        return pad(parts.month);
      case "dd":
        return pad(parts.day);
      case "d":
        return String(parts.day);
      case "EEEE":
        return WEEKDAYS[parts.weekday];
      case "EEE":
        return WEEKDAYS[parts.weekday].slice(0, 3);
      case "EEEEEE":
        return WEEKDAYS[parts.weekday].slice(0, 2);
      case "HH":
        return parts.hour === undefined ? tok : pad(parts.hour);
      case "h":
        return parts.hour === undefined ? tok : String(parts.hour % 12 || 12);
      case "mm":
        return parts.minute === undefined ? tok : pad(parts.minute);
      case "a":
        return parts.hour === undefined ? tok : parts.hour < 12 ? "AM" : "PM";
      default:
        return tok;
    }
  });
}

/**
 * Format a day key for display. Tokens are the date-fns subset this app
 * uses, so call sites read the same as before:
 *
 *   yyyy   2026      MMMM  November   EEEE    Thursday
 *   MM     11        MMM   Nov        EEE     Thu
 *   dd     05        d     5          EEEEEE  Th
 *
 * Anything else is passed through literally. The key is formatted as the
 * calendar day it names, never via `new Date("2026-11-05")`, which is UTC
 * midnight and renders as the 4th on any server west of Greenwich.
 */
export function formatDay(key: DayKey, pattern: string): string {
  const { year, month, day } = parseDayKey(key);
  return render({ year, month, day, weekday: weekdayOf(key) }, pattern);
}

/**
 * Format an instant (a timestamptz such as created_at) as the household
 * would read it, in the household zone. Same tokens as formatDay plus
 * h (12-hour), HH (24-hour), mm and a (AM/PM).
 */
export function formatInstant(instant: Date, pattern: string): string {
  const p = localParts(instant);
  return render(p, pattern);
}
