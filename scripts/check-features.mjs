// Checks for journal search, the reminders calendar file and the offline
// outbox, under bare node:
//   node --experimental-strip-types scripts/check-features.mjs
import assert from "node:assert/strict";

const search = await import("../lib/journal/search.ts");
const ics = await import("../lib/reminders/ics.ts");
let passed = 0;
const check = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };

const entry = (body, decisionSummary = null) => ({ body, decisionSummary });

check("every word must appear, in any order, whatever the capitals", () => {
  const e = entry("The Heron was back at the river this morning.");
  assert.equal(search.matchesQuery(e, search.queryWords("river heron")), true);
  assert.equal(search.matchesQuery(e, search.queryWords("HERON")), true);
  assert.equal(search.matchesQuery(e, search.queryWords("heron lake")), false);
});
check("a decision summary is searched too", () => {
  assert.equal(search.matchesQuery(entry("thinking it over", "Take the Tuesday slot"), search.queryWords("tuesday")), true);
});
check("an empty query matches everything and marks nothing", () => {
  assert.deepEqual(search.queryWords("   "), []);
  assert.equal(search.matchesQuery(entry("x"), []), true);
  assert.deepEqual(search.highlightParts("plain", []), [{ text: "plain", hit: false }]);
});
check("characters that mean something in a pattern are searched literally", () => {
  const words = search.queryWords("(a+b) $5.00?");
  assert.equal(search.matchesQuery(entry("cost was $5.00? for (a+b)"), words), true);
  const parts = search.highlightParts("is (a+b) fine", words);
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["(a+b)"]);
});
check("highlighting keeps the text whole and keeps its capitals", () => {
  const parts = search.highlightParts("Heron, heron, HERON.", ["heron"]);
  assert.equal(parts.map((p) => p.text).join(""), "Heron, heron, HERON.");
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["Heron", "heron", "HERON"]);
});
check("a long entry is cut to a window around the first match", () => {
  const body = "start ".repeat(300) + "the needle is here " + "end ".repeat(300);
  const cut = search.excerptAround(body, ["needle"]);
  assert.ok(cut.includes("needle") && cut.length < 460 && cut.startsWith("…") && cut.endsWith("…"));
  assert.equal(search.excerptAround("short", ["x"]), "short");
});

const base = { userId: "u1", startDay: "2026-11-09", morningLink: "https://lifeos.example/morning", eveningLink: "lifeos://evening", now: new Date("2026-11-09T22:15:00Z") };
check("the calendar file has two daily events, each with an alert", () => {
  const file = ics.buildReminderCalendar({ ...base, morning: "07:00", evening: "21:30" });
  assert.equal((file.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((file.match(/BEGIN:VALARM/g) || []).length, 2);
  assert.equal((file.match(/RRULE:FREQ=DAILY/g) || []).length, 2);
  assert.ok(file.includes("DTSTART:20261109T070000\r\n") && file.includes("DTSTART:20261109T213000\r\n"), "floating local times");
  assert.ok(!/DTSTART[^\r]*Z\r/.test(file) && !file.includes("TZID"), "no zone, so 7am is 7am anywhere");
  assert.ok(file.startsWith("BEGIN:VCALENDAR\r\n") && file.endsWith("END:VCALENDAR\r\n"));
  assert.ok(file.split("\r\n").every((line) => Buffer.byteLength(line) <= 75), "no line over 75 bytes");
});
check("one reminder can be left out", () => {
  const file = ics.buildReminderCalendar({ ...base, morning: null, evening: "21:00" });
  assert.equal((file.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.ok(file.includes("SUMMARY:Close the day") && !file.includes("Set the day"));
});
check("the same person always gets the same event ids, so re-adding replaces", () => {
  const a = ics.buildReminderCalendar({ ...base, morning: "07:00", evening: null });
  const b = ics.buildReminderCalendar({ ...base, morning: "06:15", evening: null, now: new Date("2026-11-10T10:00:00Z") });
  const uid = (f) => /UID:(.+)\r/.exec(f)[1];
  const seq = (f) => Number(/SEQUENCE:(\d+)/.exec(f)[1]);
  assert.equal(uid(a), uid(b));
  assert.ok(seq(b) > seq(a), "the later file wins");
});
check("only real clock times are accepted", () => {
  for (const ok of ["00:00", "07:05", "23:59"]) assert.ok(ics.TIME_OF_DAY.test(ok));
  for (const bad of ["7:00", "24:00", "12:60", "0700", "07:00:00", "x"]) assert.ok(!ics.TIME_OF_DAY.test(bad));
});

// ---- offline: the time a kept write carries ----
const stamp = await import("../lib/offline/stamp.ts");
const NOW = Date.parse("2026-11-09T18:00:00Z");
check("a kept write keeps the time it was written", () => {
  assert.equal(stamp.writtenAtFrom("2026-11-08T07:30:00.000Z", NOW).toISOString(), "2026-11-08T07:30:00.000Z");
});
check("a live write carries no time, and nonsense is ignored", () => {
  for (const v of [undefined, null, 5, "", "yesterday"]) assert.equal(stamp.writtenAtFrom(v, NOW), null);
});
check("a time from the future or the distant past is refused", () => {
  assert.equal(stamp.writtenAtFrom("2026-11-09T19:00:00Z", NOW), null);
  assert.equal(stamp.writtenAtFrom("2026-08-01T00:00:00Z", NOW), null);
  // A clock a couple of minutes fast is drift, not a lie: it counts as now.
  assert.equal(stamp.writtenAtFrom("2026-11-09T18:02:00Z", NOW).getTime(), NOW);
});
check("a sheet with no stamp is older than any stamped one", () => {
  assert.equal(stamp.sheetWrittenAt({ mood: "calm" }), 0);
  assert.equal(stamp.sheetWrittenAt(null), 0);
  assert.equal(stamp.sheetWrittenAt({ _at: "garbage" }), 0);
  assert.equal(stamp.sheetWrittenAt({ _at: "2026-11-09T07:00:00.000Z" }), Date.parse("2026-11-09T07:00:00Z"));
});

// ---- offline: the outbox, with the browser stubbed ----
const acheck = async (name, fn) => { try { await fn(); passed++; } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };
const shelf = new Map();
globalThis.localStorage = {
  getItem: (k) => (shelf.has(k) ? shelf.get(k) : null),
  setItem: (k, v) => void shelf.set(k, String(v)),
  removeItem: (k) => void shelf.delete(k),
};
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
const realFetch = globalThis.fetch;
let calls = [];
/** Answer each request from a script: a status, or "down" for no connection. */
const net = (script) => {
  calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body, who: init.headers["X-LifeOS-Profile"] ?? null });
    const answer = typeof script === "function" ? script(url, body, calls.length) : script;
    if (answer === "down") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(answer >= 400 ? { error: `no (${answer})` } : { ok: true }), { status: answer });
  };
};
const outbox = await import("../lib/offline/outbox.ts");
const fresh = () => { shelf.clear(); outbox.rememberWho({ slug: "ada", name: "Ada" }); };
const write = (n) => outbox.offlineFetch(`/api/w/${n}`, { n }, { kind: "journal", label: `w${n}` });

await acheck("with a connection a write goes straight through and nothing is kept", async () => {
  fresh(); net(200);
  const res = await write(1);
  assert.equal(res.status, 200);
  assert.equal(outbox.pending().length, 0);
  assert.equal(calls[0].body.writtenAt, undefined, "a live write carries no time");
});
await acheck("with no connection a write is kept and the caller is told it is fine", async () => {
  fresh(); net("down");
  const res = await write(1);
  assert.equal(res.ok, true);
  assert.deepEqual(await res.json(), { ok: true, queued: true });
  const [item] = outbox.pending();
  assert.equal(item.who, "ada");
  assert.ok(!Number.isNaN(Date.parse(item.writtenAt)));
});
await acheck("a server that cannot reach the data counts as no connection", async () => {
  fresh(); net(503);
  assert.equal((await write(1)).status, 202);
  assert.equal(outbox.pending().length, 1);
});
await acheck("a write the server refuses is not kept: the person needs to see why", async () => {
  fresh(); net(422);
  assert.equal((await write(1)).status, 422);
  assert.equal(outbox.pending().length, 0);
});
await acheck("kept writes go in the order written, with their time and their author", async () => {
  fresh(); net("down");
  await write(1); await write(2); await write(3);
  net(200);
  assert.equal(await outbox.flush("ada"), 3);
  assert.deepEqual(calls.map((c) => c.body.n), [1, 2, 3]);
  assert.ok(calls.every((c) => typeof c.body.writtenAt === "string" && c.who === "ada"));
  assert.equal(outbox.pending().length, 0);
});
await acheck("sending stops at the first failure and keeps the rest in order", async () => {
  fresh(); net("down");
  await write(1); await write(2); await write(3);
  net((_u, _b, n) => (n === 1 ? 200 : "down"));
  assert.equal(await outbox.flush("ada"), 1);
  assert.deepEqual(outbox.pending().map((i) => i.body.n), [2, 3]);
  net(503);
  assert.equal(await outbox.flush("ada"), 0);
  assert.equal(calls.length, 1, "one try, then it waits");
  assert.equal(outbox.sendable(), 2);
});
await acheck("someone else's writing waits for them", async () => {
  fresh(); net("down");
  await write(1);
  outbox.rememberWho({ slug: "sam", name: "Sam" });
  await write(2);
  net(200);
  assert.equal(await outbox.flush("sam"), 1);
  assert.deepEqual(calls.map((c) => c.body.n), [2]);
  assert.match(outbox.pending()[0].problem, /sign in/);
  assert.equal(await outbox.flush("ada"), 1);
  assert.equal(outbox.pending().length, 0);
});
await acheck("signed out, a kept write stays and says so", async () => {
  fresh(); net("down"); await write(1);
  net(401);
  assert.equal(await outbox.flush("ada"), 0);
  assert.match(outbox.pending()[0].problem, /Sign in/);
  assert.equal(outbox.sendable(), 1, "it will be tried again");
});
await acheck("a write the server will never take stops being retried and lets the next through", async () => {
  fresh(); net("down"); await write(1); await write(2);
  net((_u, body) => (body.n === 1 ? 422 : 200));
  assert.equal(await outbox.flush("ada"), 1);
  const [stuck] = outbox.pending();
  assert.equal(stuck.stuck, true);
  net(200);
  assert.equal(await outbox.flush("ada"), 0);
  assert.equal(calls.length, 0, "not sent again");
  outbox.discard(stuck.id);
  assert.equal(outbox.pending().length, 0);
});
await acheck("a server fault blocks the queue three times, then steps aside", async () => {
  fresh(); net("down"); await write(1); await write(2);
  net((_u, body) => (body.n === 1 ? 500 : 200));
  assert.equal(await outbox.flush("ada"), 0);
  assert.equal(await outbox.flush("ada"), 0);
  assert.equal(await outbox.flush("ada"), 1);
  assert.equal(outbox.pending().length, 1);
  assert.equal(outbox.pending()[0].stuck, true);
});
await acheck("while another tab is sending, this one leaves the outbox alone", async () => {
  fresh(); net("down"); await write(1);
  shelf.set("lifeos-outbox-sending", JSON.stringify({ id: "other-tab", until: Date.now() + 30000 }));
  net(200);
  assert.equal(await outbox.flush("ada"), 0);
  assert.equal(calls.length, 0);
  // A tab that died mid-send leaves a lease behind. It runs out.
  shelf.set("lifeos-outbox-sending", JSON.stringify({ id: "other-tab", until: Date.now() - 1 }));
  assert.equal(await outbox.flush("ada"), 1);
  assert.equal(shelf.has("lifeos-outbox-sending"), false, "the lease is handed back");
});
await acheck("if the device cannot keep it, the caller hears a failure", async () => {
  fresh(); net("down");
  const set = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error("quota"); };
  const res = await write(1);
  globalThis.localStorage.setItem = set;
  assert.equal(res.ok, false);
});
globalThis.fetch = realFetch;

if (process.exitCode) console.error(`\n${passed} passed, some failed`);
else console.log(`check-features: ${passed} checks passed`);
