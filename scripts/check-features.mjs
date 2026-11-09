// Checks for journal search and the reminders calendar file, under bare node:
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

if (process.exitCode) console.error(`\n${passed} passed, some failed`);
else console.log(`check-features: ${passed} checks passed`);
