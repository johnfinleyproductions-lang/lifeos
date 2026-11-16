// Checks for the honest-range statistics and what is built on them: the
// experiment evidence, the habit runs, the weekly trend and the insights
// cut-offs. Under bare node:
//   node --experimental-strip-types scripts/check-evidence.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

// "@/" from tsconfig, and the extensionless relative imports the app uses.
register(
  "data:text/javascript," +
    encodeURIComponent(`
      const root = ${JSON.stringify(new URL("..", import.meta.url).href)};
      const ext = (s) => (/\\.[cm]?[jt]sx?$/.test(s) ? s : s + ".ts");
      export async function resolve(specifier, context, next) {
        if (specifier.startsWith("@/")) return next(ext(root + specifier.slice(2)), context);
        if (specifier.startsWith(".")) return next(ext(specifier), context);
        return next(specifier, context);
      }
    `),
);
process.env.LIFEOS_TIMEZONE ??= "America/Chicago";
delete process.env.LIFEOS_FAKE_NOW;

const st = await import("@/lib/stats/evidence.ts");
const fx = await import("@/lib/experiments/effect.ts");
const rn = await import("@/lib/insights/runs.ts");
const hd = await import("@/lib/insights/habit-denominator.ts");
const pt = await import("@/lib/insights/patterns.ts");
const { addDays, allDays } = await import("@/lib/experiments/rules.ts");

let passed = 0;
const check = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };

// ---- the statistics ----
check("the same record always gives the same range", () => {
  const a = st.meanRange([3, 4, 4, 5, 2, 3]);
  const b = st.meanRange([3, 4, 4, 5, 2, 3]);
  assert.deepEqual(a, b);
  assert.ok(a.low < a.estimate && a.estimate < a.high);
});
check("a range is the middle of the resampled means: inside the data's own bounds", () => {
  const r = st.meanRange([1, 5, 1, 5, 1, 5, 1, 5]);
  assert.equal(r.estimate, 3);
  assert.ok(r.low >= 1 && r.high <= 5 && r.high - r.low > 0.8, `${r.low}..${r.high}`);
});
check("a constant record has no spread at all", () => {
  const r = st.meanRange([4, 4, 4, 4, 4]);
  assert.deepEqual([r.low, r.estimate, r.high], [4, 4, 4]);
});
check("more evenings give a narrower range", () => {
  const few = st.meanRange([2, 4, 3, 5, 3]);
  const many = st.meanRange(Array.from({ length: 6 }, () => [2, 4, 3, 5, 3]).flat());
  assert.ok(many.high - many.low < few.high - few.low);
});
check("a clear difference is called, a muddled one is not", () => {
  const clear = st.differenceRange([4, 5, 4, 5, 4, 5], [2, 3, 2, 3, 2, 3]);
  assert.equal(st.verdictOf(clear), "up");
  assert.ok(Math.abs(clear.estimate - 2) < 1e-9);
  const muddle = st.differenceRange([3, 5, 2, 4, 3], [4, 2, 5, 3, 3]);
  assert.equal(st.verdictOf(muddle), "unclear");
  assert.equal(st.verdictOf(st.differenceRange([2, 2, 3, 2], [4, 5, 4, 4])), "down");
});
check("Wilson: 1 of 1 proves less than 27 of 30", () => {
  const one = st.wilson(1, 1);
  const many = st.wilson(27, 30);
  assert.ok(many.low > one.low, `${many.low} vs ${one.low}`);
  assert.ok(one.low > 0 && one.high === 1);
  assert.deepEqual(st.wilson(0, 0), { estimate: 0, low: 0, high: 1 });
});
check("Wilson matches the textbook figure for 8 of 10 at 95%", () => {
  const r = st.wilson(8, 10, 0.95);
  assert.equal(r.low.toFixed(3), "0.490");
  assert.equal(r.high.toFixed(3), "0.943");
});
check("a change reads with its sign", () => {
  assert.equal(st.signed(0.64), "+0.6");
  assert.equal(st.signed(-0.25), "-0.3");
  assert.equal(st.signed(0.01), "0.0");
});

// ---- experiment evidence ----
const exp = { startDate: "2026-11-09", lengthDays: 14, cadence: "daily" };
const ratingsOf = (start, values) => new Map(values.map((v, i) => [addDays(start, i), v]).filter(([, v]) => v !== null));
check("too few rated evenings says so, with the counts, and claims nothing", () => {
  const ratings = ratingsOf("2026-11-09", [4, 5, 4]);
  const e = fx.effectOf(exp, new Map(), ratings, "2026-11-11");
  assert.equal(e.comparisons.length, 1);
  assert.equal(e.comparisons[0].range, null);
  assert.match(e.comparisons[0].sentence, /^Not enough rated evenings to tell yet: 3 during the run and 0 in the 2 weeks before\. It needs 4 of each\.$/);
  assert.equal(e.caution, null);
});
check("a run clearly above the fortnight before is called up, with the caution", () => {
  const before = ratingsOf("2026-10-26", [2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3]);
  const during = ratingsOf("2026-11-09", [4, 4, 5, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5, 4]);
  const e = fx.effectOf(exp, new Map(), new Map([...before, ...during]), "2026-11-22");
  const c = e.comparisons[0];
  assert.equal(st.verdictOf(c.range), "up");
  assert.match(c.sentence, /^Evenings averaged 4\.4 during the run \(14 rated\), against 2\.5 in the 2 weeks before \(14 rated\)\. That is \+1\.9 a night, and the 90% range runs from \+\d\.\d to \+\d\.\d\.$/);
  assert.ok(e.caution && /not proof/.test(e.caution));
  assert.ok(!/caus/i.test(c.sentence + e.caution), "never says caused");
});
check("a muddled before-and-after is too close to call", () => {
  const before = ratingsOf("2026-10-26", [3, 4, 2, 5, 3, 4, 3, 2, 4, 3, 5, 3, 4, 3]);
  const during = ratingsOf("2026-11-09", [4, 3, 3, 4, 2, 5, 3, 4, 3, 3, 4, 3, 2, 4]);
  const e = fx.effectOf(exp, new Map(), new Map([...before, ...during]), "2026-11-22");
  assert.match(e.comparisons[0].sentence, /Too close to call: the 90% range runs from -\d\.\d to \+\d\.\d, and that includes no change at all\.$/);
  assert.equal(e.caution, null);
});
check("days it was done against days it was not, once both have four rated evenings", () => {
  const days = allDays("2026-11-09", 14);
  const m = new Map(days.map((d, i) => [d, { done: i % 2 === 0 }]));
  const ratings = new Map(days.map((d, i) => [d, i % 2 === 0 ? 5 : 3]));
  const e = fx.effectOf(exp, m, ratings, "2026-11-22");
  const done = e.comparisons.find((c) => c.kind === "done");
  assert.ok(done, "printed");
  assert.equal(done.withIt.length, 7);
  assert.equal(done.without.length, 7);
  assert.match(done.sentence, /on days you did it \(7 rated\), against 3\.0 on days you did not/);
});
check("an unmarked day is not counted as a 'not' day on a daily experiment", () => {
  const days = allDays("2026-11-09", 14);
  const m = new Map(days.slice(0, 6).map((d) => [d, { done: true }]));
  const ratings = new Map(days.map((d) => [d, 4]));
  const e = fx.effectOf(exp, m, ratings, "2026-11-22");
  assert.equal(e.comparisons.find((c) => c.kind === "done"), undefined);
});
check("a short experiment still compares against a full week before", () => {
  const short = { startDate: "2026-11-09", lengthDays: 5, cadence: "daily" };
  const ratings = new Map([...ratingsOf("2026-11-02", [3, 3, 3, 3, 3, 3, 3]), ...ratingsOf("2026-11-09", [4, 4, 4, 4, 4])]);
  const e = fx.effectOf(short, new Map(), ratings, "2026-11-13");
  assert.match(e.comparisons[0].sentence, /in the week before \(7 rated\)/);
});
check("the evidence never reaches past the run's last day", () => {
  const ratings = new Map([...ratingsOf("2026-10-26", Array(14).fill(3)), ...ratingsOf("2026-11-09", Array(30).fill(5))]);
  const e = fx.effectOf(exp, new Map(), ratings, "2026-12-08");
  assert.equal(e.comparisons[0].withIt.length, 14);
});

// ---- habit runs ----
const days = allDays("2026-11-02", 14); // Mon 2 Nov .. Sun 15 Nov
const tallyFor = (cadence, kept, created = "2026-11-02") => hd.tallyHabit(days, cadence, created, new Set(kept));
check("a daily run counts up to today, and an open today does not break it", () => {
  const t = tallyFor("daily", ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
  assert.deepEqual(rn.runsOf(t, "2026-11-15"), { current: 5, longest: 5, unit: "days" });
  assert.equal(rn.runWords(rn.runsOf(t, "2026-11-15")), "Run of 5 days, its longest.");
});
check("a missed day ends the run; the longest is remembered", () => {
  const t = tallyFor("daily", ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-07", "2026-11-14"]);
  const r = rn.runsOf(t, "2026-11-15");
  assert.deepEqual([r.current, r.longest], [1, 4]);
  assert.equal(rn.runWords(r), "Longest run 4 days, 1 now.");
});
check("a weekdays run steps over the weekend", () => {
  const t = tallyFor("weekdays", ["2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10"]);
  assert.equal(rn.runsOf(t, "2026-11-11").current, 4);
});
check("days before the habit existed are not misses", () => {
  const t = tallyFor("daily", ["2026-11-12", "2026-11-13"], "2026-11-12");
  assert.deepEqual(rn.runsOf(t, "2026-11-14"), { current: 2, longest: 2, unit: "days" });
});
check("a weekly habit runs in weeks, and this week is not yet a miss", () => {
  const t = tallyFor("weekly", ["2026-11-03", "2026-11-11"]);
  assert.deepEqual(rn.runsOf(t, "2026-11-15"), { current: 2, longest: 2, unit: "weeks" });
  const open = tallyFor("weekly", ["2026-11-03"]);
  assert.deepEqual(rn.runsOf(open, "2026-11-12"), { current: 1, longest: 1, unit: "weeks" });
});
check("nothing kept prints nothing", () => {
  assert.equal(rn.runWords(rn.runsOf(tallyFor("daily", []), "2026-11-15")), null);
});

// ---- weeks and the four-week trend ----
const point = (date, r, f = 0) => ({ date, morningEnergy: null, morningMood: null, eveningRating: r, eveningMood: null, focusMinutes: f });
check("days fold into Monday weeks with a mean of what was rated", () => {
  const pts = allDays("2026-11-02", 10).map((d, i) => point(d, i === 3 ? null : 3 + (i % 2), 10));
  const w = rn.weeksOf(pts);
  assert.deepEqual(w.map((x) => x.week), ["2026-11-02", "2026-11-09"]);
  assert.equal(w[0].rated, 6);
  assert.equal(w[0].focusMinutes, 70);
  assert.equal(w[1].rated, 3);
});
check("the four-week trend needs eight rated evenings a side, then names the direction", () => {
  const pts = allDays("2026-09-21", 56).map((d, i) => point(d, i < 28 ? 2 + (i % 2) : 4 + (i % 2)));
  const t = rn.ratingTrend(pts);
  assert.equal(st.verdictOf(t.range), "up");
  assert.match(t.sentence, /^Evenings are up 2\.0 a night on the four weeks before, with a 90% range of \+\d\.\d to \+\d\.\d\.$/);
  const thin = pts.map((p, i) => (i < 28 && i % 4 ? { ...p, eveningRating: null } : p));
  assert.equal(rn.ratingTrend(thin), null);
  assert.equal(rn.ratingTrend(pts.slice(-30)), null, "a 30-day window has no four weeks before");
});

// ---- insights cut-offs ----
const data = (ratings, habits = []) => ({
  windowDays: 30, startDate: "2026-11-02", endDate: "2026-11-15", days: [],
  dayPoints: ratings.map((r, i) => point(addDays("2026-11-02", i), r)),
  habits, totalFocusMinutes: 0, totalFocusSessions: 0, decisionCount: 0,
  morningCheckins: 0, eveningCheckins: 0, activeDays: ratings.length, activeSince: "2026-11-02",
});
check("no average from four evenings; five get one, with its range", () => {
  assert.equal(pt.detectPatterns(data([3, 4, 3, 4])).find((p) => p.title === "Average day rating"), undefined);
  const p = pt.detectPatterns(data([3, 4, 3, 4, 3])).find((p) => p.title === "Average day rating");
  assert.match(p.body, /^3\.4\/5 across 5 evening shutdowns, 90% range \d\.\d to \d\.\d\. Steady period\.$/);
});
check("the most consistent habit is the proven one, not the newest", () => {
  const mk = (id, kept, possible) => ({ id, name: id, cadence: "daily", createdOn: "2026-11-02", completions: new Set(),
    tally: { cadence: "daily", since: "2026-11-02", possible, kept, unit: "days", cells: [] } });
  const p = pt.detectPatterns(data([], [mk("new one", 1, 1), mk("steady one", 27, 30)])).find((p) => p.title === "Most consistent habit");
  assert.match(p.body, /steady one/);
});

if (process.exitCode) console.error(`\n${passed} passed, some failed`);
else console.log(`check-evidence: ${passed} checks passed`);
