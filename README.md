# LifeOS

A personal daily operating system: a morning manifesto, an evening shutdown,
habits, focus sessions, quests, a journal with twelve lenses, a weekly review,
and a coach that can see your check-ins but never your journal. Several people
share one install, each picking their profile behind a household code.

Next.js 16 (App Router), React 19, TypeScript and Tailwind. Data and sign-in
live in a [NoCodeBackend](https://nocodebackend.com) database, reached from the
server over its REST API. Runs as a single standalone container with no
database of its own to look after.

## Running it

```bash
cp .env.example .env     # fill it in
docker compose up -d --build
```

That serves on <http://localhost:3001>. There is nothing to migrate and no
second container: the tables already exist in NoCodeBackend.

### As a Mac app

```bash
./mac/build-app.sh
```

Builds `LifeOS.app` with its own window and icon, installs it, and puts a
shortcut on the Desktop. It runs LifeOS on the Mac itself, so no server is
needed. `mac/README.md` has the details.

### Without Docker

Needs Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # fill it in
pnpm dev
```

## Configuration

`.env.example` is the reference and documents every variable with its
constraints. The ones you cannot skip:

| Variable | Why |
|---|---|
| `NCB_INSTANCE` | Which NoCodeBackend database holds everything, e.g. `54318_lifeos`. |
| `LIFEOS_SECRET` | Signs the profile cookie and derives each profile's sign-in. 32+ characters. Must never change once people have data. |
| `NEXT_PUBLIC_APP_URL` | The app's own public URL. |
| `LIFEOS_HOUSEHOLD_CODE` | Gates profile switching. Unset means nobody can pick a profile. |
| `LIFEOS_PROFILES` | JSON array of the people this install knows about. |
| `LIFEOS_TIMEZONE` | Which calendar a day is filed under. Defaults to `America/Chicago`. |
| `LIFEOS_DAY_START` | The hour a day begins, so a late entry files under the right day. Defaults to `4`. |

Three of those fail closed by design. With no `NCB_INSTANCE` the app has
nowhere to read from and says so. With no household code, `/pick-profile` and
the switch endpoint stay shut. With no profile list, the picker shows nobody
and says why. An unconfigured deploy is locked rather than open.

The NoCodeBackend secret key is deliberately not on that list. The app does
not use it, and `docs/nocodebackend.md` explains why it should stay out of the
app's environment.

The coach is optional. Without `LIFEOS_LLM_BASE_URL` the rest of the app works
and the coach is simply unavailable.

## Where the data lives

`docs/nocodebackend.md` is the full account: how sign-in maps onto
NoCodeBackend's native auth, how a query in the code becomes a REST call, what
was learned by testing the live service, and how to change the schema.

The short version. Every table has a `user_id` that NoCodeBackend fills from
the signed-in session and filters every read by. The app adds its own check on
top: any row that comes back belonging to someone else fails the whole read.
The journal is stored there like everything else, so it is on NoCodeBackend's
servers and no longer on yours.

## Which day is today

Almost everything LifeOS stores is filed under a calendar day, so the app has
to agree with you about which day that is. `LIFEOS_TIMEZONE` decides, and
`lib/time/day.ts` is the only thing in the codebase allowed to answer the
question. It takes an IANA zone name and refuses a fixed offset, because a
fixed offset is wrong twice a year.

This matters more than it sounds. A container's clock is UTC, so before this
existed an evening shutdown written at 7pm in Chicago was filed under tomorrow,
and the morning and evening of one night landed on two different rows. Day
arithmetic runs on `YYYY-MM-DD` keys rather than timestamps, which makes the
23-hour and 25-hour days of a daylight-saving change invisible to it.
`docs/timezone.md` has the full audit and the reasoning.

A day runs from 04:00 to 04:00, not midnight to midnight, because an evening
shutdown written at 00:30 means the day that just ended. `LIFEOS_DAY_START`
moves it. Only the boundary shifts: the clock on screen stays honest, so at
00:30 the greeting still says you are up late while the sheet still carries
yesterday's date.

If you add anything that touches a date, route it through that module rather
than calling `new Date()` or date-fns directly. `scripts/check-time.mjs` is the
unit check.

## Taking your data with you

Settings has two downloads under Your data: a Markdown document to read
(journal, days, habits, focus, quests, compass) and a JSON file holding every
row as stored. `GET /api/export?format=md|json` is the same thing. It is also
the only backup there is, so it is worth doing now and then.

Reminders are a calendar file from Settings (`GET /api/reminders`), and the
journal can be searched from Past entries.

## Writing without a connection

The morning page, the evening page, a new journal entry and a habit tick are
saved on the device first when LifeOS cannot reach its data, and sent when it
can. A small mark in the corner counts what is waiting. Nothing else works
offline: reading back, quests, the coach and the rest need the connection.

How it goes:

- Those four saves go through `offlineFetch` (`lib/offline/outbox.ts`). If
  the request fails, or the server answers that the data is out of reach, the
  write goes into an outbox in the browser's local storage with the time it
  was written and who wrote it.
- The mark (`components/offline/OutboxMark.tsx`) retries when the connection
  returns, when the window comes back into view, and every twenty seconds.
  Writes go in the order they were made. Only one tab sends at a time.
- The server files a late write under the day it was written, not the day it
  arrived. For the morning and evening pages the later edit wins: each saved
  page carries the time it was written, and a late write that is older than
  what is already there is dropped. A journal entry sent twice is stored once.
  A write made by one person is never filed under another; it waits for its
  author to sign in.
- With no connection every page leads to `/offline`, the offline desk: a
  journal box, a short morning page, a short evening page, today's habit
  ticks, and the list of what is waiting. In a browser that is the job of a
  service worker (`app/sw.js/route.ts`), which keeps a signed-out copy of that
  one page. In the Mac app the pages come from the Mac itself, so the server
  sends you there.

Limits worth knowing. The outbox lives in the browser: clearing site data, or
closing a private window, loses whatever is still waiting. The desk needs you
to have signed in on that device at least once. Editing or deleting an
existing entry is not kept offline, only new writing. And "later" is judged
by each device's own clock.

## Checks

```bash
pnpm check
```

Runs three suites under plain Node, with no network and no build:

- `scripts/check-time.mjs`, 88 checks on which calendar day an instant
  belongs to, across zones and both daylight-saving changes.
- `scripts/check-db.mjs`, 26 checks on the data layer, the last of which runs
  3,000 random queries and compares each answer with the plain meaning of the
  query.
- `scripts/check-features.mjs`, 26 checks on journal search, the reminders
  calendar file and the offline outbox (order, retries, two people on one
  device, two tabs at once).

## Health

`GET /api/health` asks NoCodeBackend a question that needs no sign-in and
returns 200 with `{"ok":true}` or 503. It reaches the store on purpose: a check
that only proves Node is running tells you about the one failure a restart
already fixes. Both the Dockerfile and compose use it.

Set `LIFEOS_NCB_TRACE=1` to log one line per request to NoCodeBackend, with its
status and how long it took.

## Deploying

`DEPLOY.md` covers the Coolify deployment.

## Repo map

```
app/                routes; one folder per surface
components/         UI, grouped by surface; components/field/ is the print layer
lib/db/             the data layer: tables, operators, planning, transport
lib/db/schema/      one file per table
lib/ncb/            NoCodeBackend config, requests and sessions
lib/profiles/       household gate, profile cookie, profile sign-in
docs/ncb/           NoCodeBackend's own setup guides and the live schema, as issued
mac/                the Mac app: window, icon, build script
scripts/            check-time.mjs, check-db.mjs
```

Design notes live in `app/globals.css`, which is where the tokens, the shared
component classes and the reasons for them are written down. The palette is
risograph: grey stock, black ink, and one fluorescent orange reserved for one
meaning, which is live, today, now.

## Known gaps

No linter is configured. `next lint` was removed in Next 16 and this repo never
had an ESLint config or dependency of its own, so the `lint` script has been
dropped rather than left to fail. Adding ESLint back is a real piece of work
with its own dependencies and its own first wave of findings. TypeScript is
checked on every `pnpm build`.

No automated end-to-end test is in the repo. The browser run that verified
this build against the live database is described in `docs/nocodebackend.md`.

Existing entries were not copied across from the Postgres versions of the app.
This build starts empty.

## The other versions

`integration/all-phases`, `v2` and `v2-polish` are the same app on Postgres,
with its own sign-in tables and migrations. This branch, `v2-ncb`, is
`v2-polish` with the storage and sign-in moved to NoCodeBackend. Nothing in the
interface differs between `v2-polish` and this branch.

`00-SETUP.md` is the original Phase 1 bootstrap playbook, kept for history.
