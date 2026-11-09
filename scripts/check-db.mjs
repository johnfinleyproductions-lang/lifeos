// Checks for the data layer in lib/db, run under bare node:
//
//   node --experimental-strip-types scripts/check-db.mjs
//
// Nothing here touches the network. The store is played by a small stand-in
// that behaves the way the live NoCodeBackend API was observed to behave:
// case-insensitive text matching, a hard cap of 500 rows a page, missing
// values sorted first, and every read limited to the signed-in person.
//
// The heart of it is the last section. It throws a few thousand random
// queries at the layer and checks each answer against the plain meaning of
// the query worked out directly. That is the guarantee the app leans on:
// whatever part of a condition is handed to the store, the result is the
// same as if none of it had been.

import assert from "node:assert/strict";
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const root = ${JSON.stringify(new URL("..", import.meta.url).href)};
      export async function resolve(specifier, context, next) {
        let s = specifier;
        if (s.startsWith("@/")) s = root + s.slice(2);
        if ((s.startsWith(".") || s.startsWith("file:")) && !/\\.[cm]?[jt]sx?$/.test(s)) s += ".ts";
        return next(s, context);
      }
    `),
);

const { table, id, owner, ref, text, integer, boolean, date, timestamp, json } =
  await import("../lib/db/table.ts");
const ops = await import("../lib/db/ops.ts");
const { createDatabase, OwnershipError } = await import("../lib/db/query.ts");
const { planRead, PAGE_SIZE } = await import("../lib/db/plan.ts");
const codec = await import("../lib/db/codec.ts");
const { and, or, eq, ne, gt, gte, lt, lte, inArray, isNull, isNotNull, like, asc, desc, count } = ops;

let passed = 0;
const check = (name, fn) =>
  Promise.resolve()
    .then(fn)
    .then(() => { passed++; })
    .catch((error) => { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1; });

// ─── Tables used only here ──────────────────────────────────────────────

const things = table("things", {
  id: id(),
  userId: owner().notNull(),
  parentId: ref("parent_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("open"),
  score: integer("score"),
  done: boolean("done").notNull().default(false),
  day: date("day"),
  at: timestamp("at"),
  payload: json("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const notes = table("notes", {
  id: id(),
  userId: owner().notNull(),
  thingId: ref("thing_id").notNull(),
  body: text("body").notNull(),
});

// ─── A stand-in for the NoCodeBackend data API ──────────────────────────

function fakeStore() {
  const tables = new Map();
  const state = { owner: "user-a", calls: [], nextId: 1, leak: false };
  const rowsOf = (name) => tables.get(name) ?? tables.set(name, []).get(name);
  const lower = (v) => (typeof v === "string" ? v.toLowerCase() : v);
  const test = (value, op, raw) => {
    if (value === null || value === undefined) return false;
    const numeric = typeof value === "number";
    const left = numeric ? value : lower(String(value));
    const cast = (s) => (numeric ? Number(s) : lower(s));
    switch (op) {
      case "eq": return left === cast(raw);
      case "ne": return left !== cast(raw);
      case "gt": return left > cast(raw);
      case "gte": return left >= cast(raw);
      case "lt": return left < cast(raw);
      case "lte": return left <= cast(raw);
      case "in": return raw.split(",").some((part) => left === cast(part));
      default: throw new Error(`fake store: unknown operator ${op}`);
    }
  };
  const transport = {
    async ownerId() { return state.owner; },
    async list(name, params) {
      state.calls.push({ op: "list", name, params: params.map((p) => p.join("=")).join("&") });
      let rows = rowsOf(name).filter((row) => state.leak || row.user_id === state.owner);
      let sort = null, order = "asc", page = 1, limit = 10;
      const seen = new Map();
      for (const [key, value] of params) {
        if (key === "sort") { sort = value; continue; }
        if (key === "order") { order = value; continue; }
        if (key === "page") { page = Number(value); continue; }
        if (key === "limit") { limit = Math.min(Number(value), 500); continue; }
        const m = /^(\w+)(?:\[(\w+)\])?$/.exec(key);
        assert.ok(m, `fake store: unreadable parameter ${key}`);
        const column = m[1], op = m[2] ?? "eq";
        // The live API answers a plain and a bracketed filter on one column
        // with a SQL error. Make that mistake impossible to miss here.
        const before = seen.get(column) ?? new Set();
        assert.ok(!before.has(op), `fake store: ${column}[${op}] sent twice`);
        assert.ok(!(op === "eq" && before.size) && !before.has("eq"), `fake store: ${column} mixes plain and bracketed filters`);
        before.add(op); seen.set(column, before);
        assert.notEqual(column, "user_id", "fake store: user_id must never be sent as a filter");
        rows = rows.filter((row) => test(row[column], op, value));
      }
      if (sort) {
        rows = [...rows].sort((a, b) => {
          const x = lower(a[sort]), y = lower(b[sort]);
          let r;
          if (x == null && y == null) r = 0; else if (x == null) r = -1; else if (y == null) r = 1;
          else r = x < y ? -1 : x > y ? 1 : 0;
          return order === "desc" ? -r : r;
        });
      }
      const start = (page - 1) * limit;
      return { rows: rows.slice(start, start + limit).map((row) => ({ ...row })), hasMore: rows.length > start + limit };
    },
    async create(name, record) {
      state.calls.push({ op: "create", name });
      assert.ok(!("id" in record), "fake store: an insert must not send an id");
      const row = { ...record, id: state.nextId++, user_id: state.owner };
      rowsOf(name).push(row);
      return row.id;
    },
    async bulkUpdate(name, records) {
      state.calls.push({ op: "update", name, n: records.length });
      assert.ok(records.length <= 500, "fake store: more than 500 records in one update");
      for (const record of records) {
        const row = rowsOf(name).find((r) => r.id === record.id && r.user_id === state.owner);
        assert.ok(row, "fake store: update of a row that is not yours");
        assert.ok(!("user_id" in record), "fake store: an update must not send user_id");
        Object.assign(row, record);
      }
    },
    async bulkDelete(name, ids) {
      state.calls.push({ op: "delete", name, n: ids.length });
      assert.ok(ids.length <= 500, "fake store: more than 500 ids in one delete");
      const list = rowsOf(name);
      for (const idValue of ids) {
        const i = list.findIndex((r) => r.id === idValue && r.user_id === state.owner);
        assert.ok(i >= 0, "fake store: delete of a row that is not yours");
        list.splice(i, 1);
      }
    },
  };
  return { state, tables, rowsOf, db: createDatabase(() => transport) };
}

// ─── Codec ──────────────────────────────────────────────────────────────

await check("datetimes go out as UTC to the second, the only form the store accepts", () => {
  assert.equal(codec.toWireDateTime(new Date("2026-11-09T20:30:00.987Z")), "2026-11-09 20:30:00");
  assert.equal(codec.toWireDateTime(new Date("2026-03-08T07:59:59.999Z")), "2026-03-08 07:59:59");
});
await check("datetimes come back as the same instant in any process zone", () => {
  assert.equal(codec.fromWireDateTime("2026-11-09 20:30:00").toISOString(), "2026-11-09T20:30:00.000Z");
  assert.equal(codec.fromWireDateTime("2026-11-09T20:30:00.000Z").toISOString(), "2026-11-09T20:30:00.000Z");
});
await check("ids are strings here and integers there", () => {
  assert.equal(codec.idToWire("42"), 42);
  assert.equal(codec.idToWire("0b1e0c2a-uuid-from-an-old-tab"), null);
  assert.equal(codec.idToWire("-3"), null);
  assert.equal(codec.idToWire("4 OR 1=1"), null);
  assert.equal(codec.decode(things.id, 42), "42");
});
await check("booleans, days and JSON survive a round trip", () => {
  assert.equal(codec.normalize(things.done, true), true);
  assert.equal(codec.decode(things.done, 0), false);
  assert.equal(codec.normalize(things.day, "2026-11-09"), "2026-11-09");
  assert.deepEqual(codec.normalize(things.payload, { three: ["a", 'b "q" é ☀'], n: 1 }), { three: ["a", 'b "q" é ☀'], n: 1 });
  assert.throws(() => codec.encode(things.day, "09/11/2026"));
  assert.throws(() => codec.encode(things.parentId, "not-an-id"));
});

// ─── Planning what the store is asked ───────────────────────────────────

const META = things[Object.getOwnPropertySymbols(things)[0]];
const paramsOf = (condition, orderings = [], limit = null) => {
  const plan = planRead(META, condition, orderings, limit);
  return { plan, text: plan.impossible ? "" : plan.paramsFor(1, 7).map((p) => p.join("=")).join("&") };
};

await check("the owner is never sent as a filter", () => {
  assert.ok(!paramsOf(eq(things.userId, "user-a")).text.includes("user_id"));
});
await check("an id lookup rides on id[in] with the nonce, never the cached by-id path", () => {
  assert.match(paramsOf(eq(things.id, "12")).text, /^id\[in\]=12,-7&/);
  assert.match(paramsOf(inArray(things.id, ["3", "4"])).text, /^id\[in\]=3,4,-7&/);
  assert.match(paramsOf(undefined).text, /^id\[ne\]=-7&/);
});
await check("an id that could never exist makes no request at all", () => {
  assert.equal(paramsOf(eq(things.id, "a-uuid")).plan.impossible, true);
  assert.equal(paramsOf(inArray(things.id, [])).plan.impossible, true);
  assert.equal(paramsOf(eq(things.parentId, "nope")).plan.impossible, true);
});
await check("a range on one column is two bracketed filters", () => {
  const { text } = paramsOf(and(gte(things.day, "2026-10-01"), lte(things.day, "2026-10-31")));
  assert.ok(text.includes("day[gte]=2026-10-01") && text.includes("day[lte]=2026-10-31"));
});
await check("equal and not-equal on one column are never both sent", () => {
  const { text } = paramsOf(and(eq(things.score, 3), ne(things.score, 4)));
  assert.ok(text.includes("score=3") && !text.includes("score[ne]"));
});
await check("not-equal on text stays at home, because the store ignores case", () => {
  assert.ok(!paramsOf(ne(things.status, "open")).text.includes("status"));
});
await check("text that is not plain is not sent", () => {
  assert.ok(!paramsOf(eq(things.name, "a,b")).text.includes("name"));
  assert.ok(!paramsOf(eq(things.name, "50% off")).text.includes("name"));
  assert.ok(!paramsOf(eq(things.name, "")).text.includes("name"));
});
await check("an instant with milliseconds is rounded outward", () => {
  const t = new Date("2026-11-09T12:00:00.500Z");
  assert.ok(paramsOf(lt(things.at, t)).text.includes("at[lte]=2026-11-09 12:00:00"));
  assert.ok(paramsOf(gt(things.at, t)).text.includes("at[gte]=2026-11-09 12:00:00"));
});
await check("the store sorts and limits only when it would choose the same rows", () => {
  assert.equal(paramsOf(eq(things.score, 1), [desc(things.createdAt)], 1).plan.singlePage, true);
  assert.equal(paramsOf(eq(things.status, "open"), [desc(things.createdAt)], 1).plan.singlePage, false, "text match is a wider net");
  assert.equal(paramsOf(undefined, [desc(things.at)], 1).plan.singlePage, false, "nullable sort column");
  assert.equal(paramsOf(isNull(things.at), [desc(things.createdAt)], 1).plan.singlePage, false, "is-null cannot be sent");
  assert.equal(paramsOf(undefined, [desc(things.createdAt), asc(things.id)], 5).plan.singlePage, false, "two sort keys");
});

// ─── Reads, writes and the rules around them ────────────────────────────

await check("an insert fills defaults, takes the session's owner and returns the stored row", async () => {
  const { db, rowsOf } = fakeStore();
  const [row] = await db.insert(things).values({ userId: "user-a", name: "first", at: new Date("2026-11-09T20:30:00.987Z"), payload: { a: 1 } }).returning();
  assert.equal(row.id, "1");
  assert.equal(row.status, "open");
  assert.equal(row.done, false);
  assert.equal(row.at.toISOString(), "2026-11-09T20:30:00.000Z", "what comes back is what was kept");
  assert.equal(row.createdAt.getTime() % 1000, 0);
  assert.equal(row.score, null);
  const stored = rowsOf("things")[0];
  assert.equal(stored.done, 0);
  assert.equal(stored.payload, '{"a":1}');
  assert.equal(stored.at, "2026-11-09 20:30:00");
});
await check("an insert for somebody else is refused before it is sent", async () => {
  const { db, state } = fakeStore();
  await assert.rejects(db.insert(things).values({ userId: "user-b", name: "x" }).then((r) => r), OwnershipError);
  assert.equal(state.calls.length, 0);
});
await check("an insert missing a required value is refused", async () => {
  const { db } = fakeStore();
  await assert.rejects(db.insert(notes).values({ userId: "user-a", thingId: "1", body: null }).then((r) => r));
});
await check("a row belonging to someone else fails the whole read", async () => {
  const { db, state } = fakeStore();
  await db.insert(things).values({ userId: "user-a", name: "mine" });
  state.owner = "user-b";
  await db.insert(things).values({ userId: "user-b", name: "theirs" });
  assert.equal((await db.select().from(things)).length, 1);
  state.leak = true; // the store starts handing out everybody's rows
  await assert.rejects(db.select().from(things).then((r) => r), OwnershipError);
  await assert.rejects(db.select({ n: count() }).from(things).then((r) => r), OwnershipError);
  await assert.rejects(db.update(things).set({ name: "x" }).where(eq(things.name, "mine")).then((r) => r), OwnershipError);
  await assert.rejects(db.delete(things).where(eq(things.name, "mine")).then((r) => r), OwnershipError);
});
await check("every read URL is different from the last", async () => {
  const { db, state } = fakeStore();
  for (let i = 0; i < 50; i++) await db.select().from(things).where(eq(things.score, 1));
  const urls = state.calls.map((c) => c.params);
  assert.equal(new Set(urls).size, 50);
});
await check("more than one page is read to the end", async () => {
  const { db, state } = fakeStore();
  for (let i = 0; i < 1203; i++) await db.insert(things).values({ userId: "user-a", name: `n${i}`, score: i });
  state.calls.length = 0;
  const rows = await db.select().from(things).orderBy(desc(things.score));
  assert.equal(rows.length, 1203);
  assert.equal(rows[0].score, 1202);
  assert.equal(state.calls.length, 3);
  const [{ n }] = await db.select({ n: count() }).from(things).where(gte(things.score, 1000));
  assert.equal(n, 203);
});
await check("latest-row queries cost one small request", async () => {
  const { db, state } = fakeStore();
  for (let i = 0; i < 40; i++) await db.insert(things).values({ userId: "user-a", name: `n${i}`, score: i % 4, createdAt: new Date(Date.UTC(2026, 0, 1 + i)) });
  state.calls.length = 0;
  const [latest] = await db.select().from(things).where(and(eq(things.userId, "user-a"), eq(things.score, 3))).orderBy(desc(things.createdAt)).limit(1);
  assert.equal(latest.name, "n39");
  assert.equal(state.calls.length, 1);
  assert.ok(state.calls[0].params.includes("limit=1") && state.calls[0].params.includes("sort=created_at"));
});
await check("an update changes exactly the rows the condition names and returns them", async () => {
  const { db, rowsOf, state } = fakeStore();
  for (const name of ["a", "b", "c"]) await db.insert(things).values({ userId: "user-a", name, score: name === "b" ? 5 : 1 });
  const out = await db.update(things).set({ status: "shut", done: true, at: null }).where(and(eq(things.userId, "user-a"), eq(things.score, 1))).returning();
  assert.deepEqual(out.map((r) => r.name), ["a", "c"]);
  assert.ok(out.every((r) => r.status === "shut" && r.done === true));
  assert.deepEqual(rowsOf("things").map((r) => r.status), ["shut", "open", "shut"]);
  assert.equal(state.calls.filter((c) => c.op === "update").length, 1);
  assert.deepEqual(await db.update(things).set({ status: "x" }).where(eq(things.id, "999")).returning(), []);
  await assert.rejects(db.update(things).set({ userId: "user-b" }).where(eq(things.id, "1")).then((r) => r));
  await assert.rejects(db.update(things).set({ name: null }).where(eq(things.id, "1")).then((r) => r));
});
await check("a delete takes the children with it, children first", async () => {
  const { db, rowsOf, state } = fakeStore();
  db.cascade(things, notes, notes.thingId);
  const [a] = await db.insert(things).values({ userId: "user-a", name: "a" }).returning();
  const [b] = await db.insert(things).values({ userId: "user-a", name: "b" }).returning();
  await db.insert(notes).values([{ userId: "user-a", thingId: a.id, body: "1" }, { userId: "user-a", thingId: a.id, body: "2" }, { userId: "user-a", thingId: b.id, body: "3" }]);
  state.calls.length = 0;
  const gone = await db.delete(things).where(and(eq(things.id, a.id), eq(things.userId, "user-a"))).returning({ id: things.id });
  assert.deepEqual(gone, [{ id: a.id }]);
  assert.deepEqual(rowsOf("notes").map((r) => r.body), ["3"]);
  assert.deepEqual(rowsOf("things").map((r) => r.name), ["b"]);
  const deletes = state.calls.filter((c) => c.op === "delete").map((c) => c.name);
  assert.deepEqual(deletes, ["notes", "things"]);
});
await check("a delete with no condition is refused", async () => {
  const { db } = fakeStore();
  await assert.rejects(db.delete(things).then((r) => r));
});
await check("missing values sort last ascending and first descending, as Postgres did", async () => {
  const { db } = fakeStore();
  for (const score of [2, null, 1]) await db.insert(things).values({ userId: "user-a", name: "x", score });
  assert.deepEqual((await db.select({ s: things.score }).from(things).orderBy(asc(things.score))).map((r) => r.s), [1, 2, null]);
  assert.deepEqual((await db.select({ s: things.score }).from(things).orderBy(desc(things.score))).map((r) => r.s), [null, 2, 1]);
});
await check("text matching is exact here even though the store ignores case", async () => {
  const { db } = fakeStore();
  for (const status of ["Open", "open", "OPEN"]) await db.insert(things).values({ userId: "user-a", name: "x", status });
  assert.equal((await db.select().from(things).where(eq(things.status, "open"))).length, 1);
  assert.equal((await db.select().from(things).where(ne(things.status, "open"))).length, 2);
  assert.equal((await db.select().from(things).where(like(things.status, "O%"))).length, 2);
});

// ─── Random queries against the plain meaning ───────────────────────────

await check("3000 random queries mean the same thing with and without the store's help", async () => {
  let seed = 20261109;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const maybe = (value, p = 0.25) => (rand() < p ? null : value);

  const { db } = fakeStore();
  const statuses = ["open", "Open", "shut", "a,b", "50% off", ""];
  const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-09"];
  const instants = [0, 500, 1000, 1500, 86_400_000].map((ms) => new Date(Date.UTC(2026, 9, 1) + ms));
  const all = [];
  for (let i = 0; i < 320; i++) {
    const [row] = await db.insert(things).values({
      userId: "user-a",
      name: pick(["ant", "Bee", "cat", "dog_", "e%l"]),
      status: pick(statuses),
      score: maybe(Math.floor(rand() * 6)),
      done: rand() < 0.5,
      day: maybe(pick(days)),
      at: maybe(pick(instants)),
      parentId: maybe(String(1 + Math.floor(rand() * 5))),
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000),
    }).returning();
    all.push(row);
  }

  const leaf = () => {
    switch (Math.floor(rand() * 16)) {
      case 0: return eq(things.userId, pick(["user-a", "user-a", "user-b"]));
      case 1: return pick([eq, ne])(things.status, pick(statuses));
      case 2: return pick([eq, ne, gt, gte, lt, lte])(things.score, Math.floor(rand() * 6));
      case 3: return pick([eq, ne])(things.done, rand() < 0.5);
      case 4: return pick([eq, ne, gt, gte, lt, lte])(things.day, pick(days));
      case 5: return pick([eq, gt, gte, lt, lte])(things.at, new Date(pick(instants).getTime() + pick([0, 0, 250, 999])));
      case 6: return pick([eq, ne])(things.parentId, pick(["1", "2", "9", "junk"]));
      case 7: return inArray(things.score, [pick([0, 1]), pick([2, 3])].slice(0, 1 + Math.floor(rand() * 2)));
      case 8: return inArray(things.status, pick([["open"], ["open", "shut"], ["a,b"], []]));
      case 9: return inArray(things.id, pick([[], ["1", "2", "300"], [all[5].id, "junk"], ["junk"]]));
      case 10: return eq(things.id, pick([all[0].id, all[77].id, "99999", "junk"]));
      case 11: return pick([isNull, isNotNull])(pick([things.score, things.day, things.at]));
      case 12: return like(things.name, pick(["%e%", "d_g_", "e\\%l", "Bee", "%"]));
      case 13: return inArray(things.parentId, pick([["1", "2"], ["junk"], ["3", "junk"]]));
      case 14: return gte(things.createdAt, new Date(Date.UTC(2026, 0, 1) + Math.floor(rand() * 320) * 1000 + pick([0, 400])));
      default: return or(eq(things.score, 1), eq(things.status, "shut"));
    }
  };
  const columns = [things.score, things.day, things.at, things.createdAt, things.status, things.id];

  for (let i = 0; i < 3000; i++) {
    const parts = Array.from({ length: Math.floor(rand() * 4) }, leaf);
    const condition = rand() < 0.1 && parts.length ? or(...parts) : and(...parts);
    const sortColumn = rand() < 0.75 ? pick(columns) : null;
    const direction = pick([asc, desc]);
    // A second key on the id makes the order total, so the two sides must
    // agree row for row. Without it only the sort keys are compared.
    const total = rand() < 0.5;
    const orderings = sortColumn ? (total ? [direction(sortColumn), asc(things.id)] : [direction(sortColumn)]) : [];
    const limit = rand() < 0.5 ? pick([0, 1, 3, 10, 700]) : null;

    // ids compare as text in the reference only when sorted by id as a tiebreak
    // on equal-length strings; give the reference numeric ids to stay honest.
    const expected = (() => {
      let rows = all.filter((row) => ops.matches(row, condition));
      rows = [...rows].sort((a, b) => {
        for (const o of orderings) {
          const key = o.column.key;
          const x = key === "id" ? Number(a.id) : a[key] instanceof Date ? a[key].getTime() : a[key];
          const y = key === "id" ? Number(b.id) : b[key] instanceof Date ? b[key].getTime() : b[key];
          let r;
          if (x == null && y == null) r = 0; else if (x == null) r = 1; else if (y == null) r = -1;
          else r = x < y ? -1 : x > y ? 1 : 0;
          if (r) return o.direction === "asc" ? r : -r;
        }
        return 0;
      });
      return limit === null ? rows : rows.slice(0, limit);
    })();

    let query = db.select().from(things).where(condition);
    if (orderings.length) query = query.orderBy(...orderings);
    if (limit !== null) query = query.limit(limit);
    const actual = await query;

    const describe = `query ${i}`;
    assert.equal(actual.length, expected.length, `${describe}: row count`);
    if (orderings.length && total && sortColumn !== things.id) {
      assert.deepEqual(actual.map((r) => r.id), expected.map((r) => r.id), `${describe}: rows and order`);
    } else if (sortColumn && sortColumn !== things.id) {
      const key = sortColumn.key;
      const show = (r) => (r[key] instanceof Date ? r[key].getTime() : r[key]);
      assert.deepEqual(actual.map(show), expected.map(show), `${describe}: sort keys`);
    } else if (limit === null) {
      assert.deepEqual(actual.map((r) => r.id).sort(), expected.map((r) => r.id).sort(), `${describe}: same set`);
    }
    for (const row of actual) assert.ok(ops.matches(row, condition), `${describe}: a returned row does not match`);
  }
});

if (process.exitCode) {
  console.error(`\n${passed} passed, some failed`);
} else {
  console.log(`check-db: ${passed} checks passed`);
}
