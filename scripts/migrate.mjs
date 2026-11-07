// Applies the SQL files in ../drizzle to DATABASE_URL, then exits.
//
// Why this exists instead of `pnpm db:migrate`: drizzle-kit is a
// devDependency and the runner stage of the Dockerfile only receives
// .next/standalone, which carries next/react/react-dom and nothing else —
// Next.js 16 bundles server dependencies into the server chunks, so even
// drizzle-orm and postgres are not importable at runtime there. The
// Dockerfile therefore copies those two packages (both dependency-free)
// into scripts/node_modules, and this file is plain ESM so it runs under
// bare `node` with no compile step.
//
// Run locally with:  DATABASE_URL=... node scripts/migrate.mjs
// In the image it runs from docker-entrypoint.sh before the server starts.

import { fileURLToPath } from "node:url";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Lives next to the script, so this resolves the same locally and at
// /app/scripts/migrate.mjs in the image.
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));

// Arbitrary but fixed. Two containers booting at once must not both run
// the migrations; whoever gets the lock goes first and the other waits,
// then finds nothing left to apply. Advisory locks are session-scoped, so
// a crashed process releases it when its connection drops.
const LOCK_KEY = 4915031;
const LOCK_TIMEOUT_MS = 120_000;
const LOCK_RETRY_MS = 2_000;

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set. Refusing to start.");
  process.exit(1);
}

// max: 1 keeps the advisory lock and the migrations on one session.
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
  onnotice: () => {},
});

let locked = false;

try {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    const [row] = await client`select pg_try_advisory_lock(${LOCK_KEY}) as ok`;
    if (row.ok) {
      locked = true;
      break;
    }
    if (Date.now() >= deadline) {
      console.error(
        `[migrate] another process has held the migration lock for ${
          LOCK_TIMEOUT_MS / 1000
        }s. Refusing to start.`,
      );
      process.exit(1);
    }
    log("waiting for the migration lock held by another instance...");
    await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
  }

  log(`applying migrations from ${MIGRATIONS_FOLDER}`);
  const started = Date.now();
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  log(`schema up to date in ${Date.now() - started}ms`);
} catch (err) {
  // Print the real error: this runs in deploy logs, where a vague failure
  // costs far more than it reveals.
  console.error("[migrate] FAILED");
  console.error(err);
  process.exit(1);
} finally {
  if (locked) {
    try {
      await client`select pg_advisory_unlock(${LOCK_KEY})`;
    } catch {
      // Connection is about to close, which releases it anyway.
    }
  }
  await client.end({ timeout: 5 });
}
