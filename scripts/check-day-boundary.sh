#!/usr/bin/env bash
# Behavioural check for the household day boundary.
#
# Starts the built app on $PORT with a given process zone (TZ) and a faked
# clock (LIFEOS_FAKE_NOW), writes a morning manifesto, an evening shutdown,
# a habit completion, a journal entry and a protocol run through the real
# HTTP API, then reads the dates back from Postgres. Everything written in
# the same local evening must land on the same entry_date, and that date
# must be the one the person in the household would name.
#
#   TZ=UTC             LIFEOS_FAKE_NOW=2026-11-07T19:00:00-06:00 scripts/check-day-boundary.sh 2026-11-07
#   TZ=America/Chicago LIFEOS_FAKE_NOW=2026-11-07T23:30:00-06:00 scripts/check-day-boundary.sh 2026-11-07
#
# Needs DATABASE_URL, BETTER_AUTH_SECRET, LIFEOS_HOUSEHOLD_CODE and
# LIFEOS_PROFILES in the environment (the same ones the build needed), a
# profile with slug "sam", and `pnpm build` already run.
set -euo pipefail

EXPECTED="${1:?expected day key, e.g. 2026-11-07}"
PORT="${PORT:-3300}"
BASE="http://localhost:$PORT"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAR="$(mktemp)"
LOG="$(mktemp)"
trap 'fuser -k "$PORT/tcp" >/dev/null 2>&1 || true; rm -f "$JAR"' EXIT

echo "== TZ=${TZ:-unset} LIFEOS_FAKE_NOW=${LIFEOS_FAKE_NOW:-unset} expecting entry_date $EXPECTED"

# Stale listener from a previous run would give a false pass against an
# old build. Kill by port, not by name.
fuser -k "$PORT/tcp" >/dev/null 2>&1 || true
sleep 0.5

psql "$DATABASE_URL" -q -c "
  delete from lifeos_habit_completions;
  delete from lifeos_daily_checkins;
  delete from lifeos_journal_entries;
  delete from lifeos_protocol_runs;
  delete from lifeos_focus_sessions;
  delete from lifeos_habits;
"

(cd "$ROOT" && PORT="$PORT" node_modules/.bin/next start -p "$PORT" >"$LOG" 2>&1 &)
for _ in $(seq 1 60); do
  if curl -fs "$BASE/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fs "$BASE/api/health" >/dev/null || { echo "server did not come up"; cat "$LOG"; exit 1; }
grep '\[time\]' "$LOG" | sed 's/^/   server: /' || true

post() { # path json
  curl -s -b "$JAR" -c "$JAR" -H 'content-type: application/json' -X POST "$BASE$1" -d "$2"
}

post /api/profile/unlock '{"code":"opensesame"}' >/dev/null
post /api/profile/switch '{"slug":"sam"}' | grep -q '"ok":true' || { echo "profile switch failed"; exit 1; }

post /api/morning '{"energy":4,"mood":"steady","manifesto":"I do the work.","priorities":["ship phase 7"],"protect":"the evening","gratitude":"coffee"}' | grep -q '"ok":true' || { echo "morning failed"; exit 1; }
post /api/evening '{"dayRating":4,"dayMood":"calm","win":"dates agree","lesson":"one clock","tomorrowSeed":"review"}' | grep -q '"ok":true' || { echo "evening failed"; exit 1; }
HABIT_ID=$(post /api/habits '{"name":"Read","cadence":"daily"}' | sed -n 's/.*"habit":{"id":"\([^"]*\)".*/\1/p')
[ -n "$HABIT_ID" ] || { echo "habit create failed"; exit 1; }
post "/api/habits/$HABIT_ID/toggle" '{}' | grep -q '"completed":true' || { echo "toggle failed"; exit 1; }
post /api/journal/entries '{"mode":"stream","body":"evening page"}' | grep -q '"ok":true' || { echo "journal failed"; exit 1; }
post /api/protocols/brain_dump '{"payload":{"dump":"everything"}}' | grep -q '"ok":true' || { echo "protocol failed"; exit 1; }
post /api/focus/start '{"label":"phase 7"}' | grep -q '"ok":true' || { echo "focus start failed"; exit 1; }
post /api/focus/stop '{}' | grep -q '"ok":true' || { echo "focus stop failed"; exit 1; }

# What the Today page says the date is. The stamp reads "Saturday, 7 November".
STAMP=$(curl -s -b "$JAR" "$BASE/" | grep -o '[A-Z][a-z]*day, [0-9]* [A-Z][a-z]*' | head -1 || true)
GREETING=$(curl -s -b "$JAR" "$BASE/" | grep -o 'Still up\|Good morning\|Good afternoon\|Good evening\|Late night' | head -1 || true)

echo "-- rows in the database"
psql "$DATABASE_URL" -At -F' ' -c "
  select 'checkin', entry_date::text, (morning is not null)::text, (evening is not null)::text, created_at from lifeos_daily_checkins
  union all select 'habit', completion_date::text, '', '', created_at from lifeos_habit_completions
  union all select 'journal', entry_date::text, mode, '', created_at from lifeos_journal_entries
  union all select 'protocol', run_date::text, slug, '', created_at from lifeos_protocol_runs
  union all select 'focus', to_char(started_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI\"Z\"'), coalesce(label,''), '', created_at from lifeos_focus_sessions
  order by 1;" | sed 's/^/   /'

echo "-- Today page stamp: ${STAMP:-not found}; greeting: ${GREETING:-not found}"

FAIL=0
ROWS=$(psql "$DATABASE_URL" -At -c "select count(*) from lifeos_daily_checkins")
[ "$ROWS" = "1" ] || { echo "FAIL: expected one check-in row (morning and evening together), got $ROWS"; FAIL=1; }
for q in \
  "select entry_date from lifeos_daily_checkins" \
  "select completion_date from lifeos_habit_completions" \
  "select entry_date from lifeos_journal_entries" \
  "select run_date from lifeos_protocol_runs"; do
  got=$(psql "$DATABASE_URL" -At -c "$q")
  [ "$got" = "$EXPECTED" ] || { echo "FAIL: '$q' gave '$got', expected $EXPECTED"; FAIL=1; }
done
if [ -n "$STAMP" ]; then
  EXP_STAMP=$(TZ=UTC date -d "$EXPECTED" '+%A, %-d %B')
  [ "$STAMP" = "$EXP_STAMP" ] || { echo "FAIL: page stamp '$STAMP', expected '$EXP_STAMP'"; FAIL=1; }
fi

if [ "$FAIL" = 0 ]; then echo "PASS: every day-keyed row is $EXPECTED"; else exit 1; fi
