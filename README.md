# LifeOS

A personal daily operating system: a morning manifesto, an evening shutdown,
habits, focus sessions, quests, a journal with twelve lenses, a weekly review,
and a coach that can see your check-ins but never your journal. Several people
share one install, each picking their profile behind a household code.

Next.js 16 (App Router), React 19, TypeScript, Tailwind, Drizzle ORM and
Postgres. Runs as a single standalone container.

## Running it

```sh
cp .env.example .env     # then fill it in, see Configuration below
docker compose up -d --build
```

That brings up Postgres and the app together, applies the schema, and serves on
<http://localhost:3001>. Nothing else to run: migrations are applied by the
container's entrypoint on every boot, before the server starts.

### Against a database you already have

Set `DATABASE_URL` in `.env` and start only the app. The bundled Postgres
service is then ignored.

```sh
docker compose up -d --build app
```

LifeOS owns its own schema, so it is safe to point this at a database that
holds other things: it creates and migrates only its own `lifeos_*` tables plus
the four better-auth tables (`user`, `session`, `account`, `verification`).

To move LifeOS out of a shared database and into its own, `scripts/copy-data.mjs`
copies just the rows that belong to it. It takes only the users its own data
references, rather than everybody in a shared `user` table, verifies the result
byte for byte, and refuses to call the copy complete if anything differs.

```sh
SOURCE_DATABASE_URL=postgres://...old \
DATABASE_URL=postgres://...new \
  node scripts/copy-data.mjs --dry-run
```

### Without Docker

Needs Node 22+, pnpm and a reachable Postgres.

```sh
pnpm install
pnpm db:deploy        # apply migrations
pnpm dev              # http://localhost:3001
```

With no `LIFEOS_PROFILES` set, development falls back to two sample profiles so
this works out of the box. Production refuses to invent anyone.

## Configuration

`.env.example` is the reference and documents every variable with its
constraints. The ones you cannot skip:

| Variable | Why |
|---|---|
| `DATABASE_URL` | Postgres connection. Supplied by compose unless you set it. |
| `BETTER_AUTH_SECRET` | Signs sessions and the profile cookie. 32+ characters. |
| `BETTER_AUTH_URL` | The app's own public URL. |
| `LIFEOS_HOUSEHOLD_CODE` | Gates profile switching. Unset means nobody can pick a profile. |
| `LIFEOS_PROFILES` | JSON array of the people this install knows about. |
| `LIFEOS_TIMEZONE` | Which calendar a day is filed under. Defaults to `America/Chicago`. |
| `LIFEOS_DAY_START` | The hour a day begins, so a late entry files under the right day. Defaults to `4`. |

Two of those fail closed by design. With no household code, `/pick-profile` and
the switch endpoint stay shut. With no profile list, the picker shows nobody and
says why. An unconfigured deploy is locked rather than open, and a malformed
profile list is refused whole rather than quietly dropping one person.

The coach is optional. Without `LIFEOS_LLM_BASE_URL` the rest of the app works
and the coach is simply unavailable.

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
unit check and `scripts/check-day-boundary.sh` drives a real server across the
boundary.

## Schema changes

Drizzle schema lives in `lib/db/schema/`, exported from `lifeos.ts`. After
editing it:

```sh
pnpm db:generate      # writes a new file under drizzle/
```

Then read the generated SQL and make it idempotent before committing it
(`CREATE TABLE IF NOT EXISTS`, and guard constraints against `pg_constraint`).
These migrations run against databases that may already hold some of the
objects, so they have to tolerate that.

`pnpm db:deploy` applies them. It is the same `scripts/migrate.mjs` the
container runs, takes a Postgres advisory lock so two instances booting at once
cannot both migrate, and exits non-zero on failure.

Add any new `lifeos_*` table to the `TABLES` array in `scripts/copy-data.mjs`
too, in foreign-key-safe order, or that script will refuse to run rather than
silently leave your data behind.

## Health

`GET /api/health` runs `SELECT 1` and returns 200 with `{"ok":true}` or 503. It
touches the database on purpose: a check that only proves Node is running tells
you about the one failure a restart already fixes. Both the Dockerfile and
compose use it.

## Deploying

`DEPLOY.md` covers the Coolify deployment, including the DNS and the
shared-cookie setup that lets Evergreen Core sign you in.

## Repo map

```
app/                routes; one folder per surface
components/         UI, grouped by surface; components/field/ is the print layer
lib/db/schema/      Drizzle tables, exported from lifeos.ts
lib/profiles/       household gate, profile cookie, provisioning
drizzle/            generated SQL migrations and their journal
scripts/            migrate.mjs, copy-data.mjs
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

## A note on the other docs

`00-SETUP.md` is the original Phase 1 bootstrap playbook, kept for history. It
describes copying Evergreen Core's environment and schema, which is no longer
how this works: LifeOS now owns its own migrations and can run on its own
database. Start here instead.
