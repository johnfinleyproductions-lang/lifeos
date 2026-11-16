// The coach's privacy wall, as a test instead of a promise (docs/privacy.md).
//
// Walks every module the coach can reach, starting from its page and its
// API routes, following "@/..." and relative imports. Fails if any reached
// module names a private table (the journal, its open loops) in code, or
// imports anything under lib/journal. Comments are ignored, so a module
// may still say what it must not do.
//
// lib/db is the store's plumbing: it registers every table, private ones
// included, and reads none of them on the coach's behalf. It is the one
// place allowed to name them.
//
//   node scripts/check-privacy.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ENTRIES = ["app/coach", "app/api/coach", "lib/coach", "components/coach"];
const PRIVATE = /\b(lifeosJournalEntries|lifeosOpenLoops|lifeos_journal_entries|lifeos_open_loops)\b/;
const PRIVATE_DIR = "lib/journal/";
const PLUMBING = "lib/db/";

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package, outside the app
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

function filesUnder(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { recursive: true })
    .map((f) => path.join(abs, f))
    .filter((f) => /\.(ts|tsx)$/.test(f));
}

/** Every module reachable from the entries, with the path that reached it. */
export function reach(entries = ENTRIES) {
  const seen = new Map();
  const queue = entries.flatMap(filesUnder).map((f) => [f, [path.relative(ROOT, f)]]);
  while (queue.length) {
    const [file, trail] = queue.shift();
    if (seen.has(file)) continue;
    seen.set(file, trail);
    const src = stripComments(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(/(?:import|export)[^"'`]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const next = resolve(file, m[1] ?? m[2]);
      if (next && !seen.has(next)) queue.push([next, [...trail, path.relative(ROOT, next)]]);
    }
  }
  return seen;
}

export function breaches(seen) {
  const out = [];
  for (const [file, trail] of seen) {
    const rel = path.relative(ROOT, file);
    if (rel.startsWith(PLUMBING)) continue;
    if (rel.startsWith(PRIVATE_DIR)) { out.push({ rel, why: "imports the journal module", trail }); continue; }
    const hit = stripComments(fs.readFileSync(file, "utf8")).match(PRIVATE);
    if (hit) out.push({ rel, why: `names ${hit[1]}`, trail });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seen = reach();
  const bad = breaches(seen);
  const entryCount = ENTRIES.flatMap(filesUnder).length;
  if (entryCount === 0) {
    console.error("FAIL  no coach entry files found: the check would pass on nothing");
    process.exit(1);
  }
  if (bad.length) {
    for (const b of bad) console.error(`FAIL  ${b.rel} ${b.why}\n      reached by ${b.trail.join(" -> ")}`);
    process.exit(1);
  }
  console.log(`check-privacy: ok, ${seen.size} modules reachable from ${entryCount} coach files, none can read the journal`);
}
