// Copies the LifeOS-owned data out of a shared database into one LifeOS owns.
//
// LifeOS has been pointing DATABASE_URL at Evergreen Core's database, so its
// tables sit alongside EC's and share EC's `user` table. This moves only what
// LifeOS owns.
//
// It is NOT a dump. EC's `user` table holds EC's users too, and copying all of
// them would import people who have never opened LifeOS. The user set is
// derived from the data instead: every user_id actually referenced by a
// lifeos_* row, plus any email listed in LIFEOS_COPY_EMAILS. A configured
// profile with no data yet needs nothing copied — the picker provisions it on
// first use.
//
//   SOURCE_DATABASE_URL=postgres://...ec   \
//   DATABASE_URL=postgres://...lifeos      \
//   node scripts/copy-data.mjs [--dry-run]
//
// Run migrations on the target first (`pnpm db:deploy`). Safe to re-run:
// every insert is ON CONFLICT DO NOTHING, so a half-finished copy resumes.

import postgres from "postgres";

// Insert order, not alphabetical: `account` references `user`,
// `lifeos_habit_completions` references `lifeos_habits`, and
// `lifeos_open_loops` references `lifeos_journal_entries`.
//
// `session` and `verification` are deliberately absent. Both are transient,
// and Phase 5 rotates BETTER_AUTH_SECRET, which invalidates every session
// anyway — copying them would move rows that are dead on arrival. `account`
// IS copied: it holds the credentials.
const TABLES = [
  { name: "user", scope: "id" },
  // better-auth names its columns in camelCase, unlike the lifeos_* tables.
  { name: "account", scope: "userId" },
  { name: "lifeos_habits", scope: "user_id" },
  { name: "lifeos_journal_entries", scope: "user_id" },
  { name: "lifeos_habit_completions", scope: "user_id" },
  { name: "lifeos_open_loops", scope: "user_id" },
  { name: "lifeos_compass", scope: "user_id" },
  { name: "lifeos_confidence_entries", scope: "user_id" },
  { name: "lifeos_daily_checkins", scope: "user_id" },
  { name: "lifeos_focus_sessions", scope: "user_id" },
  { name: "lifeos_protocol_runs", scope: "user_id" },
  { name: "lifeos_quests", scope: "user_id" },
  { name: "lifeos_reframes_seen", scope: "user_id" },
];

const LIFEOS_TABLES = TABLES.filter((t) => t.name.startsWith("lifeos_")).map(
  (t) => t.name,
);

const BATCH = 500;
const DRY_RUN = process.argv.includes("--dry-run");

function log(msg) {
  console.log(`[copy] ${msg}`);
}

function fail(msg) {
  console.error(`[copy] ${msg}`);
  process.exit(1);
}

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl) fail("SOURCE_DATABASE_URL is not set.");
if (!targetUrl) fail("DATABASE_URL (the target) is not set.");
if (sourceUrl === targetUrl) {
  fail("SOURCE_DATABASE_URL and DATABASE_URL are the same database.");
}

// Read dates, timestamps and JSON back as the exact text Postgres sent.
//
// This is not a nicety. By default postgres-js turns a timestamptz into a JS
// Date, which holds milliseconds, so 12:10:30.900879 is written back as
// .900 — silent loss in a copy you cannot redo once the source is gone. Worse,
// a plain `date` becomes a UTC-midnight Date, and re-inserting that on a server
// in America/Chicago lands a day earlier: every entry_date, completion_date,
// run_date and quest date shifted back by one. Row counts and foreign keys do
// not notice. JSON is included because jsonb stores numbers as numeric, and a
// trip through JSON.parse would round anything past float precision.
//
// Both connections need it, for different reasons. The source would otherwise
// parse these columns into JS values on the way in. The target would otherwise
// mangle them on the way out: postgres-js describes the statement, learns the
// parameter is a timestamptz, and then runs the string through its own date
// serializer — new Date(x).toISOString() — which is where the microseconds go.
// Verified: a value written through the driver landed as .900000 while the same
// text through psql landed as .900879. `serialize` here is identity, so the
// text Postgres sent is the text Postgres gets back.
const RAW_TEXT_TYPES = {
  raw: {
    to: 0,
    from: [1082, 1083, 1114, 1184, 114, 3802], // date, time, timestamp, timestamptz, json, jsonb
    serialize: (x) => x,
    parse: (x) => x,
  },
};

const src = postgres(sourceUrl, {
  max: 1,
  connect_timeout: 15,
  onnotice: () => {},
  types: RAW_TEXT_TYPES,
});
const dst = postgres(targetUrl, {
  max: 1,
  connect_timeout: 15,
  onnotice: () => {},
  types: RAW_TEXT_TYPES,
});

async function columnsOf(client, table) {
  const rows = await client`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
  `;
  return new Set(rows.map((r) => r.column_name));
}

async function tablesPresent(client) {
  const rows = await client`
    select table_name from information_schema.tables
    where table_schema = 'public'
  `;
  return new Set(rows.map((r) => r.table_name));
}

try {
  // So the verification checksum renders timestamptz the same way on both
  // sides. The copy itself does not depend on this — the text it moves carries
  // its own offset — but a checksum compared across two session timezones
  // would report a mismatch that is not there.
  await Promise.all([src`set time zone 'UTC'`, dst`set time zone 'UTC'`]);

  const [srcTables, dstTables] = await Promise.all([
    tablesPresent(src),
    tablesPresent(dst),
  ]);

  // Fail loudly on schema drift rather than silently leaving data behind: if
  // the source has a lifeos_* table this script does not know about, someone
  // added one and did not update TABLES.
  const unknown = [...srcTables]
    .filter((t) => t.startsWith("lifeos_") && !LIFEOS_TABLES.includes(t))
    .sort();
  if (unknown.length) {
    fail(
      `source has lifeos_* tables this script does not know about: ${unknown.join(
        ", ",
      )}. Add them to TABLES in insert order.`,
    );
  }

  const missing = TABLES.map((t) => t.name).filter((t) => !dstTables.has(t));
  if (missing.length) {
    fail(
      `target is missing ${missing.join(
        ", ",
      )}. Run the migrations first: DATABASE_URL=<target> node scripts/migrate.mjs`,
    );
  }

  // --- resolve the user set -------------------------------------------------

  const referenced = new Set();
  for (const table of LIFEOS_TABLES) {
    if (!srcTables.has(table)) continue;
    const rows = await src`
      select distinct user_id from ${src(table)} where user_id is not null
    `;
    for (const r of rows) referenced.add(r.user_id);
  }

  const extraEmails = (process.env.LIFEOS_COPY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (extraEmails.length) {
    const rows = await src`
      select id, email from "user" where email in ${src(extraEmails)}
    `;
    for (const r of rows) referenced.add(r.id);
    const found = new Set(rows.map((r) => r.email));
    for (const e of extraEmails) {
      if (!found.has(e)) log(`note: LIFEOS_COPY_EMAILS lists ${e}, not in source`);
    }
  }

  const userIds = [...referenced];
  if (!userIds.length) {
    fail("no LifeOS data found in the source. Is SOURCE_DATABASE_URL right?");
  }

  const [{ count: totalSourceUsers }] = await src`select count(*)::int from "user"`;
  log(
    `${userIds.length} of ${totalSourceUsers} users in the source are LifeOS users`,
  );
  const named = await src`
    select email from "user" where id in ${src(userIds)} order by email
  `;
  for (const u of named) log(`  ${u.email}`);

  // --- copy ----------------------------------------------------------------

  let mismatch = false;
  const summary = [];

  for (const { name, scope } of TABLES) {
    if (!srcTables.has(name)) {
      summary.push({ table: name, selected: 0, note: "absent in source" });
      continue;
    }

    // Intersection only: the source still carries pre-Phase-2 shapes and may
    // have columns the target dropped, or lack ones it has added since.
    const srcCols = await columnsOf(src, name);
    const dstCols = await columnsOf(dst, name);
    const cols = [...srcCols].filter((c) => dstCols.has(c));
    const dropped = [...srcCols].filter((c) => !dstCols.has(c));
    if (dropped.length) {
      log(`${name}: ignoring source-only columns ${dropped.join(", ")}`);
    }

    const rows = await src`
      select ${src(cols)} from ${src(name)}
      where ${src(scope)} in ${src(userIds)}
    `;

    if (DRY_RUN) {
      summary.push({ table: name, selected: rows.length, inserted: "-" });
      continue;
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      // No conflict target named, so this covers the primary key and every
      // unique constraint the table happens to have.
      const res = await dst`
        insert into ${dst(name)} ${dst(chunk, ...cols)}
        on conflict do nothing
      `;
      inserted += res.count;
    }

    const [{ count: inTarget }] = await dst`
      select count(*)::int from ${dst(name)} where ${dst(scope)} in ${dst(userIds)}
    `;
    if (inTarget !== rows.length) {
      mismatch = true;
    }
    summary.push({
      table: name,
      scope,
      cols,
      selected: rows.length,
      inserted,
      inTarget,
      ok: inTarget === rows.length,
    });
  }

  // --- verify content, not just counts -------------------------------------
  //
  // Matching row counts proved nothing the first time this ran: every date had
  // shifted back a day and every timestamp had lost its microseconds, and the
  // counts were perfect. So compare the actual bytes. The hash is computed
  // inside each database over the shared columns, ordered by content, so
  // nothing passes through this process to be re-encoded on the way.
  async function contentHash(client, table, cols, scope) {
    const [row] = await client`
      select coalesce(md5(string_agg(x, '' order by x)), 'empty') as h
      from (
        select to_jsonb(r)::text as x from (
          select ${client(cols)} from ${client(table)}
          where ${client(scope)} in ${client(userIds)}
        ) r
      ) s
    `;
    return row.h;
  }

  const drifted = [];
  if (!DRY_RUN) {
    for (const r of summary) {
      if (r.note || !r.cols) continue;
      const [a, b] = await Promise.all([
        contentHash(src, r.table, r.cols, r.scope),
        contentHash(dst, r.table, r.cols, r.scope),
      ]);
      r.identical = a === b;
      if (!r.identical) drifted.push(r.table);
    }
  }

  // --- report --------------------------------------------------------------

  console.log("");
  console.log(DRY_RUN ? "DRY RUN — nothing written" : "copied");
  console.log("");
  for (const r of summary) {
    if (r.note) {
      console.log(`  ${r.table.padEnd(26)} ${r.note}`);
    } else if (DRY_RUN) {
      console.log(`  ${r.table.padEnd(26)} ${String(r.selected).padStart(6)} rows`);
    } else {
      const verdict = !r.ok
        ? "COUNT MISMATCH"
        : r.identical === false
          ? "CONTENT DIFFERS"
          : "ok";
      console.log(
        `  ${r.table.padEnd(26)} ${String(r.selected).padStart(6)} source` +
          ` ${String(r.inserted).padStart(6)} new` +
          ` ${String(r.inTarget).padStart(6)} target  ${verdict}`,
      );
    }
  }
  console.log("");

  if (mismatch) {
    fail("row counts do not match. The target is NOT a complete copy.");
  }
  if (drifted.length) {
    fail(
      `content differs in ${drifted.join(
        ", ",
      )}. The rows are all there but they are not the same rows. Do NOT cut over.`,
    );
  }
  if (!DRY_RUN) log("every table matches the source, byte for byte");
} catch (err) {
  console.error("[copy] FAILED");
  console.error(err);
  process.exit(1);
} finally {
  await Promise.allSettled([src.end({ timeout: 5 }), dst.end({ timeout: 5 })]);
}
