// Checks for lib/time/day.ts and lib/quests/quarter.ts. No test framework:
// plain assertions, run under bare node with type stripping, so it works
// in the same environment as scripts/migrate.mjs.
//
//   node --experimental-strip-types scripts/check-time.mjs
//
// Run it under more than one process zone to prove the answers do not
// depend on it:
//
//   TZ=UTC node --experimental-strip-types scripts/check-time.mjs
//   TZ=America/Chicago node --experimental-strip-types scripts/check-time.mjs
//   TZ=Asia/Tokyo node --experimental-strip-types scripts/check-time.mjs
//
// Chicago's 2026 transitions: 8 March 02:00 CST -> 03:00 CDT (a 23-hour
// day) and 1 November 02:00 CDT -> 01:00 CST (a 25-hour day).

import assert from "node:assert/strict";
import { register } from "node:module";

// The source uses the "@/" path alias from tsconfig. Teach node's resolver
// the one mapping it needs; nothing else about resolution changes.
register(
  "data:text/javascript," +
    encodeURIComponent(`
      const root = ${JSON.stringify(new URL("..", import.meta.url).href)};
      export async function resolve(specifier, context, next) {
        if (specifier.startsWith("@/")) {
          let s = root + specifier.slice(2);
          if (!/\.[cm]?[jt]sx?$/.test(s)) s += ".ts";
          return next(s, context);
        }
        return next(specifier, context);
      }
    `),
);

process.env.LIFEOS_TIMEZONE ??= "America/Chicago";
delete process.env.LIFEOS_FAKE_NOW;

const day = await import("../lib/time/day.ts");
const quarter = await import("../lib/quests/quarter.ts");

const {
  addDays,
  dayKeyOf,
  dayOfYear,
  daysBetween,
  endOfDay,
  formatDay,
  formatInstant,
  hoursInDay,
  householdZone,
  isValidTimeZone,
  lastNDays,
  localParts,
  startOfDay,
  weekdayOf,
} = day;

let n = 0;
function check(label, actual, expected) {
  n++;
  try {
    assert.deepEqual(actual, expected);
  } catch (e) {
    console.error(`FAIL ${label}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  }
}

const procZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(`process zone ${procZone} (TZ=${process.env.TZ ?? "unset"}), household ${householdZone()}`);

// --- the bug this module exists for --------------------------------------
// An evening in Chicago. In UTC it is already tomorrow.
const chicagoEvening = new Date("2026-11-07T19:00:00-06:00"); // 01:00Z on the 8th
check("19:00 Chicago is the 7th", dayKeyOf(chicagoEvening), "2026-11-07");
check("23:30 Chicago is still the 7th", dayKeyOf(new Date("2026-11-07T23:30:00-06:00")), "2026-11-07");
check("23:59:59 Chicago is still the 7th", dayKeyOf(new Date("2026-11-07T23:59:59-06:00")), "2026-11-07");
check("00:00 Chicago is the 8th", dayKeyOf(new Date("2026-11-08T00:00:00-06:00")), "2026-11-08");
check("00:30 Chicago is the 8th (midnight boundary, no rollover offset)", dayKeyOf(new Date("2026-11-08T00:30:00-06:00")), "2026-11-08");
check("06:00 Chicago morning is the 7th", dayKeyOf(new Date("2026-11-07T06:00:00-06:00")), "2026-11-07");

// What the old code did: date-fns format() in the process zone.
{
  const { format } = await import("date-fns");
  const old = format(chicagoEvening, "yyyy-MM-dd");
  console.log(`  (old path) date-fns format(19:00 Chicago) under TZ=${procZone}: ${old}${old !== "2026-11-07" ? "  <-- wrong day" : ""}`);
  const oldDisplay = format(new Date("2026-11-05"), "MMM d");
  console.log(`  (old path) date-fns format(new Date("2026-11-05"), "MMM d") under TZ=${procZone}: ${oldDisplay}${oldDisplay !== "Nov 5" ? "  <-- wrong day" : ""}`);
}

// --- fall back: 1 Nov 2026, 02:00 CDT -> 01:00 CST, 25-hour day -----------
check("fall-back day has 25 hours", hoursInDay("2026-11-01"), 25);
check("fall-back day starts at 05:00Z (CDT)", startOfDay("2026-11-01").toISOString(), "2026-11-01T05:00:00.000Z");
check("day after fall-back starts at 06:00Z (CST)", startOfDay("2026-11-02").toISOString(), "2026-11-02T06:00:00.000Z");
check("endOfDay(11-01) == startOfDay(11-02)", endOfDay("2026-11-01").getTime(), startOfDay("2026-11-02").getTime());
check("01:30 CDT (first time) is 11-01", dayKeyOf(new Date("2026-11-01T06:30:00Z")), "2026-11-01");
check("01:30 CST (second time) is 11-01", dayKeyOf(new Date("2026-11-01T07:30:00Z")), "2026-11-01");
check("local hour at 06:59:59Z is 1", localParts(new Date("2026-11-01T06:59:59Z")).hour, 1);
check("local hour at 07:00:00Z is 1 again", localParts(new Date("2026-11-01T07:00:00Z")).hour, 1);
check("23:59 CST on 11-01 is still 11-01", dayKeyOf(new Date("2026-11-02T05:59:00Z")), "2026-11-01");
check("00:00 CST on 11-02 is 11-02", dayKeyOf(new Date("2026-11-02T06:00:00Z")), "2026-11-02");
check("evening of 11-01 (19:00 CST = 01:00Z next day) is 11-01", dayKeyOf(new Date("2026-11-02T01:00:00Z")), "2026-11-01");

// --- spring forward: 8 Mar 2026, 02:00 CST -> 03:00 CDT, 23-hour day ------
check("spring-forward day has 23 hours", hoursInDay("2026-03-08"), 23);
check("spring-forward day starts at 06:00Z (CST)", startOfDay("2026-03-08").toISOString(), "2026-03-08T06:00:00.000Z");
check("day after spring-forward starts at 05:00Z (CDT)", startOfDay("2026-03-09").toISOString(), "2026-03-09T05:00:00.000Z");
check("01:59:59 CST is hour 1", localParts(new Date("2026-03-08T07:59:59Z")).hour, 1);
check("the next second is 03:00 CDT", localParts(new Date("2026-03-08T08:00:00Z")).hour, 3);
check("23:30 CDT on 03-08 is 03-08", dayKeyOf(new Date("2026-03-09T04:30:00Z")), "2026-03-08");
check("00:30 CDT on 03-09 is 03-09", dayKeyOf(new Date("2026-03-09T05:30:00Z")), "2026-03-09");

// --- ordinary days are 24h ----------------------------------------------
check("an ordinary day has 24 hours", hoursInDay("2026-11-07"), 24);
check("ordinary start", startOfDay("2026-11-07").toISOString(), "2026-11-07T06:00:00.000Z");
check("summer start", startOfDay("2026-07-04").toISOString(), "2026-07-04T05:00:00.000Z");

// --- day-key arithmetic across the transitions -------------------------
check("addDays across fall-back", addDays("2026-10-31", 1), "2026-11-01");
check("addDays across fall-back (2)", addDays("2026-10-31", 2), "2026-11-02");
check("addDays across spring-forward", addDays("2026-03-07", 2), "2026-03-09");
check("addDays negative across year", addDays("2026-01-01", -1), "2025-12-31");
check("addDays leap", addDays("2024-02-28", 1), "2024-02-29");
check("daysBetween Q4", daysBetween("2026-10-01", "2026-12-31"), 91);
check("daysBetween Q1", daysBetween("2026-01-01", "2026-03-31"), 89);
check("lastNDays spans fall-back without a repeat or a gap",
  lastNDays(5, "2026-11-03"),
  ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
check("lastNDays spans spring-forward",
  lastNDays(3, "2026-03-09"),
  ["2026-03-07", "2026-03-08", "2026-03-09"]);
check("lastNDays(365) has 365 unique keys", new Set(lastNDays(365, "2026-11-07")).size, 365);
check("365-day window starts a year ago less one day", lastNDays(365, "2026-11-07")[0], "2025-11-08");

// --- day of year, weekday ---------------------------------------------
check("dayOfYear 1 Jan", dayOfYear("2026-01-01"), 1);
check("dayOfYear 7 Nov 2026", dayOfYear("2026-11-07"), 311);
check("dayOfYear 31 Dec 2026", dayOfYear("2026-12-31"), 365);
check("dayOfYear 31 Dec 2024 (leap)", dayOfYear("2024-12-31"), 366);
check("dayOfYear day after spring-forward", dayOfYear("2026-03-09"), 68);
check("weekday 7 Nov 2026 is Saturday", weekdayOf("2026-11-07"), 6);
check("weekday 1 Nov 2026 is Sunday", weekdayOf("2026-11-01"), 0);

// --- text ----------------------------------------------------------
check("formatDay long", formatDay("2026-11-05", "EEEE, d MMMM yyyy"), "Thursday, 5 November 2026");
check("formatDay US", formatDay("2026-11-05", "EEEE, MMMM d, yyyy"), "Thursday, November 5, 2026");
check("formatDay short", formatDay("2026-11-05", "MMM d"), "Nov 5");
check("formatDay stamp", formatDay("2026-11-05", "EEEE, d MMMM"), "Thursday, 5 November");
check("formatDay two-letter weekday", formatDay("2026-11-02", "EEEEEE"), "Mo");
check("formatDay yyyy-MM-dd round-trips", formatDay("2026-01-09", "yyyy-MM-dd"), "2026-01-09");
check("formatInstant date of an instant, household zone", formatInstant(chicagoEvening, "d MMM yyyy"), "7 Nov 2026");
check("formatInstant time", formatInstant(chicagoEvening, "h:mm a"), "7:00 PM");
check("formatInstant midnight", formatInstant(new Date("2026-11-08T06:00:00Z"), "h:mm a"), "12:00 AM");
check("formatInstant noon", formatInstant(new Date("2026-11-07T18:05:00Z"), "h:mm a"), "12:05 PM");

// --- quarters -------------------------------------------------------
check("Q1 has 90 days", quarter.quarterProgress("2026-03-31").totalDays, 90);
check("Q1 last day is day 90", quarter.quarterProgress("2026-03-31").day, 90);
check("Q1 day 1", quarter.quarterProgress("2026-01-01").day, 1);
check("day after spring-forward is Q1 day 68", quarter.quarterProgress("2026-03-09").day, 68);
check("Q2 has 91 days", quarter.quarterProgress("2026-06-30").totalDays, 91);
check("Q3 has 92 days", quarter.quarterProgress("2026-09-30").totalDays, 92);
check("Q4 has 92 days", quarter.quarterProgress("2026-12-31").totalDays, 92);
check("7 Nov is Q4 day 38", quarter.quarterProgress("2026-11-07").day, 38);
check("day after fall-back is Q4 day 33", quarter.quarterProgress("2026-11-02").day, 33);
check("quarter label", quarter.currentQuarter("2026-11-07"), "2026Q4");
check("quarter phase 7 Nov", quarter.quarterProgress("2026-11-07").phase, "Grind");

// The old quarter maths, for the record. Pure, so it can be loaded from
// git and run here; its answers depend on the process zone.
{
  const { execSync } = await import("node:child_process");
  const { writeFileSync, mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  try {
    const src = execSync("git show f290580:lib/quests/quarter.ts", { encoding: "utf8" });
    const dir = mkdtempSync(join(tmpdir(), "oldq-"));
    const file = join(dir, "quarter.ts");
    writeFileSync(file, src);
    const old = await import(file);
    const q1 = old.quarterProgress(new Date(2026, 2, 31, 12)); // 31 Mar noon local
    const q1first = old.quarterProgress(new Date(2026, 2, 9, 0, 30)); // 9 Mar 00:30 local
    console.log(`  (old path) quarterProgress under TZ=${procZone}: Q1 totalDays=${q1.totalDays}${q1.totalDays !== 90 ? "  <-- should be 90" : ""}, 9 Mar 00:30 day=${q1first.day}${q1first.day !== 68 ? "  <-- should be 68" : ""}`);
  } catch (e) {
    console.log(`  (old path) could not load old quarter.ts: ${e.message.split("\n")[0]}`);
  }
}

// --- configuration --------------------------------------------------
check("valid zone", isValidTimeZone("Europe/London"), true);
check("invalid zone", isValidTimeZone("Mars/Olympus_Mons"), false);
check("empty zone", isValidTimeZone(""), false);
check("fixed offsets are not zones", isValidTimeZone("UTC-6"), false);

console.log(`${n} checks, ${process.exitCode ? "FAILURES" : "all passed"}`);
