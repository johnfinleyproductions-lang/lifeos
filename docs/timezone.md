# Which day is it

LifeOS is a daily log. `entry_date`, `completion_date`, `run_date` and the
quest dates are calendar days, and the app has to agree with the person
about which day it is. Before Phase 7 nothing decided that: every call site
asked the server clock in the server's own zone, which is UTC in a container
and America/Chicago on the development machine, and the two gave different
wrong answers.

The fix is one module, `lib/time/day.ts`, that owns "the household's today"
and every conversion between instants, day keys and text. It is driven by
`LIFEOS_TIMEZONE` (IANA name, default `America/Chicago`), resolves zones
through `Intl.DateTimeFormat`, and refuses to boot on a bad value. Day keys
are plain `YYYY-MM-DD` strings, the same shape Drizzle reads and writes for
`date` columns, and arithmetic on them is pure calendar arithmetic.

## Audit, 7 November 2026

Every place that derived a calendar day or "now", before the change. "Process
zone" means `TZ` of the Node process: UTC in the Docker image, whatever the
host says otherwise.

| Site | Derived | Resolved via | Verdict |
|---|---|---|---|
| `app/api/morning/route.ts` | `entry_date` for the upsert | date-fns `format(new Date())`, process zone | Wrong under UTC: 7pm Chicago writes tomorrow's row |
| `app/api/evening/route.ts` | `entry_date` | same | Wrong under UTC, same way; morning and evening could land on different rows from 6pm Chicago onward |
| `app/api/habits/[id]/toggle/route.ts` | `completion_date` | same | Wrong under UTC; toggling after 6pm Chicago marks tomorrow |
| `app/api/journal/entries/route.ts` | default `entry_date` | same | Wrong under UTC (client may pass an explicit date, which was fine) |
| `app/api/protocols/[slug]/route.ts` | `run_date` | same | Wrong under UTC |
| `app/api/reflection/weekly-review/route.ts` | `run_date` | same | Wrong under UTC |
| `app/api/quests/route.ts` | default `quarter` via `currentQuarter()` | `getFullYear/getMonth`, process zone | Wrong under UTC for the last 6 hours of a quarter's final day |
| `app/api/focus/start`, `stop` | `started_at`, `ended_at` | `new Date()` | Instants, correct in any zone. Switched to the module clock so the test seam covers them |
| `app/api/import-v3/route.ts` | `entry_date` | explicit in the payload | Correct |
| `lib/checkin/today.ts` | today's row lookup | date-fns `format(new Date())` | Wrong under UTC: Today page shows no manifesto after 6pm |
| `lib/coach/context.ts` | `today` to decide whether latest check-in is today | same | Wrong under UTC |
| `lib/coach/system-prompt.ts` | "today is Thursday, November 5" and `MMM d` of `created_at` | same | Wrong under UTC after 6pm (model told the wrong date) |
| `lib/insights/queries.ts` | 30-day window, day list, focus-by-day bucketing | `format`, `subDays`, `startOfDay`, `format(startedAt)` | Wrong under UTC: window ends tomorrow, today's row absent, focus sessions after 6pm bucketed into tomorrow |
| `lib/insights/patterns.ts` | label for best day | `format(new Date("YYYY-MM-DD"))` | Wrong under Chicago: `new Date("2026-11-05")` is UTC midnight, renders as Nov 4 west of Greenwich. Right under UTC |
| `lib/reflection/auto-detect.ts` | 7-day window, 365-day heatmap, suggested wins | `format(subDays(new Date()))`, `startOfDay` | Wrong under UTC: heatmap's last cell is tomorrow, today never lights up until 6pm UTC-next-day |
| `lib/quests/quarter.ts` | quarter label, day-of-quarter, total days | `getFullYear/getMonth`, ms arithmetic / 86,400,000 | Wrong under UTC after 6pm on quarter boundaries. Wrong under Chicago independently: Q1 `totalDays` was 89 (the quarter loses an hour in March), and the day number was off by one for the first hour after midnight from 8 March to 1 November |
| `app/page.tsx` | stamp date, day-of-year, greeting hour | `getDay/getDate/getMonth/getHours`, process zone | Wrong under UTC: "Sunday, 8 November" at 7pm Saturday; greeting said "Still up" at 7pm. Day-of-year had the same DST off-by-one as quarter.ts |
| `app/layout.tsx` | `PressMargin` sheet number | `dayOfYear(new Date())` | Wrong under UTC after 6pm; DST off-by-one under Chicago |
| `components/PageStamp.tsx` | stamp date and day-of-year on every page | same as `app/page.tsx` | Same verdict |
| `components/Sidebar.tsx` | "Day N of YYYY" | browser clock, post-mount effect | Device's zone, not the household's. Right for a device in Chicago; now passed from the server |
| `app/morning/page.tsx`, `app/evening/page.tsx` | today's row | date-fns `format(new Date())` | Wrong under UTC |
| `app/habits/page.tsx` | 7-day strip dates and labels | `format(subDays(new Date()))` | Wrong under UTC: strip ends tomorrow |
| `app/focus/page.tsx` | "today's" sessions | `startOfDay(new Date())` | Wrong under UTC: day starts at 6pm Chicago |
| `components/today/FocusHabitsCard.tsx` | today key and day start | both | Wrong under UTC |
| `components/insights/Trends.tsx` | axis and tooltip labels from day keys | `format(new Date(key))` | Wrong under Chicago (UTC-midnight parse), right under UTC |
| `app/journal/past/page.tsx` | day heading from key; `h:mm a` of `created_at` | `format(new Date(key))`; `format(createdAt)` | Heading wrong under Chicago; time wrong under UTC |
| `app/journal/decisions/page.tsx` | `d MMM yyyy` of `created_at` | `format(createdAt)`, process zone | Wrong under UTC after 6pm |
| `app/identity/page.tsx` | `d MMM` and `d MMMM yyyy` of `created_at` | same | Wrong under UTC after 6pm |
| `components/reflection/YearHeatmap.tsx` | weekday of a key | `new Date(key + "T00:00:00").getDay()` | Correct (local parse, local getDay); switched to `weekdayOf` for one less Date |
| `components/focus/FocusClient.tsx` | `h:mm a` of session start | date-fns in the browser | Device zone. Left alone: it is a client component and a time of day on the user's own screen |
| `components/protocols/ProtocolRunner.tsx` | elapsed seconds | `Date.now()` differences | Correct, no calendar involved |
| `lib/auth/server-helpers.ts`, `lib/profiles/household.ts` | synthetic timestamps, cookie age | `new Date()`, `Date.now()` | Instants, correct |
| `scripts/copy-data.mjs` | `date` columns | read and written as text | Correct since Phase 4 |
| SQL `current_date` / `now()::date` | | | None anywhere in `lib/`, `app/`, `components/` or `drizzle/`. `DEFAULT now()` on `timestamptz` columns is an instant and zone-independent |

Summary: 27 sites derived a day from the process zone or rendered a stored
key through a Date. Under the container's UTC, every write after 6pm
Chicago (7pm in winter) went to tomorrow and every read looked for today
under tomorrow's key. Under a Chicago process zone the
writes were right but four display sites rendered stored keys one day early,
and the quarter and day-of-year counts were wrong around DST. No
configuration of the old code was correct everywhere.

## Decisions

**One module.** `lib/time/day.ts` is the only importer of the wall clock for
calendar purposes. `todayKey()`, `dayKeyOf(instant)`, `addDays`,
`daysBetween`, `lastNDays`, `startOfDay(key)`, `endOfDay(key)`, `weekdayOf`,
`dayOfYear`, `formatDay(key, pattern)`, `formatInstant(instant, pattern)`,
`localParts(instant)`. `now()` is the clock. Nothing else calls
`format(new Date(), ...)`.

**Intl, not offsets.** The zone offset is read from `Intl.DateTimeFormat`
at the instant in question, so DST is whatever ICU's tz database says. Node
22 ships full ICU including on Alpine, so the Docker image needs no `tzdata`
package. `UTC-6` is rejected as a zone on purpose: a fixed offset is wrong
twice a year.

**Explicit dates, not a pinned Postgres session zone.** The app never asks
SQL for a date, so there is nothing to pin for. Every `date` column is
written from a key the module produced and read back as the same string
(Drizzle `date()` is in string mode). `timestamptz` columns are instants.
Setting `TimeZone` on the connection would make a future `current_date`
accidentally right while hiding the dependency; an explicit parameter from
the one clock cannot disagree with itself. The guard is a grep that should
stay empty:

    grep -rn "current_date\|CURRENT_DATE\|now()::date\|::date" lib app components drizzle

**Default `America/Chicago`.** The owner's zone. Defaulting to the process
zone would default to UTC in the container, which is the bug. The startup
log says whether the value came from the environment or the default.

**Fail at boot.** `instrumentation.ts` imports `lib/time/boot.ts` in the Node
runtime, which resolves the zone and calls `process.exit(1)` with the reason
if it is bad. Next otherwise keeps the process alive and 500s every request,
health check included; an exit is what an orchestrator can act on.

**Midnight is the boundary.** The "when does my day end" question (an
evening shutdown at 00:30 probably belongs to the day that just ended) is
real, and the module is shaped so that a `LIFEOS_DAY_STARTS_AT=04:00` would
be a change to `todayKey()` and `startOfDay()` only, plus `dayKeyOf` for
focus-session bucketing. It is not built. It is a product decision about what
a day is, it changes what the heatmap and streaks mean, and shipping correct
midnight behaviour beats shipping a half-decided rollover.

## Checks

`scripts/check-time.mjs`: 70 assertions over the module and the quarter
maths. Run under `TZ=UTC`, `TZ=America/Chicago`, `TZ=Asia/Tokyo` and
`TZ=Pacific/Kiritimati`; all pass in all four, and the script prints what the
old code path answers in each zone for comparison.

    node --experimental-strip-types scripts/check-time.mjs

DST cases covered: 1 November 2026 (02:00 CDT to 01:00 CST): the day has 25
hours, starts at 05:00Z and the next at 06:00Z, 01:30 both times through is
the 1st, 19:00 CST (01:00Z on the 2nd) is still the 1st. 8 March 2026 (02:00
CST to 03:00 CDT): 23 hours, 06:00Z then 05:00Z, 01:59:59 is hour 1 and the
next second is hour 3. `lastNDays` across both transitions has no gap and no
repeat; `addDays` and `daysBetween` are unaffected; Q1 is 90 days, Q4 is 92,
9 March is Q1 day 68 and day-of-year 68.

`scripts/check-day-boundary.sh`: starts the built app on port 3300 with a
given `TZ` and a faked clock (`LIFEOS_FAKE_NOW`), writes a morning, an
evening, a habit completion, a journal entry, a protocol run and a focus
session through the HTTP API with real cookies, and reads the dates back
from Postgres. Passed for: 19:00 and 23:30 Chicago under `TZ=UTC`,
`TZ=America/Chicago` and `TZ=Asia/Tokyo` (one check-in row, every date
2026-11-07, page stamp "Saturday, 7 November", greeting "Good evening" and
"Late night"); 00:30 on the 8th (every date 2026-11-08, "Still up"); the
fall-back night at 01:30 CDT and 01:30 CST and the evening of the 25-hour
day (all 2026-11-01); 01:59 CST and 03:00 CDT on 8 March and 23:30 CDT that
evening (all 2026-03-08); `LIFEOS_TIMEZONE=Europe/London` at 01:00Z
(2026-11-08). A bad `LIFEOS_TIMEZONE` exits the standalone server with code
1 and the reason.

## The clock seam

`LIFEOS_FAKE_NOW=<ISO instant>` shifts the module clock so that instant is
"now" at startup and time keeps moving from there. It exists so the day
boundary can be tested without `faketime`. It is honoured in every
environment and announced with a WARNING line on every boot where it is
set; do not set it in production.
