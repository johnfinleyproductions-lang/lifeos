/**
 * How sure a number is. Small, honest statistics for a record kept by one
 * person, a few weeks at a time.
 *
 * Two tools, both chosen because they behave on tiny samples:
 *
 *   - the bootstrap: resample what was recorded, with replacement, many
 *     times, and read the middle 90% of the results as the range. It makes
 *     no claim about the shape of the data, which matters for ratings that
 *     only run 1 to 5.
 *   - the Wilson interval for "kept k of n": it stays inside 0..1 and does
 *     not call 1 of 1 a certainty, so a habit made yesterday cannot outrank
 *     one kept 27 days of 30.
 *
 * Sources (in the Evergreen library): the percentile bootstrap, 5th to 95th
 * percentile for a 90% range, follows Bruce, Bruce and Gedeck, AI-Assisted
 * Statistics for Data Scientists, 3rd ed., pp. 92-96 and 189. Every range
 * is printed with its level because Wilke, Fundamentals of Data
 * Visualization, p. 207, is right that a range without one says nothing.
 *
 * Nothing here reads the clock or the database. The random numbers come
 * from a seeded generator, so the same record always gives the same range:
 * a page that changes its answer on reload would not be trusted.
 */

/** mulberry32: a tiny seeded generator, good enough for resampling. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from the values themselves, so a range never jitters. */
export function seedOf(...groups: number[][]): number {
  let h = 2166136261;
  for (const g of groups) {
    for (const v of [g.length, ...g]) {
      h ^= Math.round(v * 1000);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

export function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function resampleMean(xs: number[], rand: () => number): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)];
  return s / xs.length;
}

export type Range = { estimate: number; low: number; high: number };

/** The share of the range kept: 90%, the usual "honest range" for a small record. */
export const LEVEL = 0.9;
const ITERATIONS = 2000;

/** The mean of one sample, with a bootstrap range around it. */
export function meanRange(xs: number[], level = LEVEL): Range {
  if (xs.length === 0) throw new Error("meanRange needs at least one value");
  const rand = seededRandom(seedOf(xs));
  const means = Array.from({ length: ITERATIONS }, () => resampleMean(xs, rand)).sort(
    (a, b) => a - b,
  );
  const tail = (1 - level) / 2;
  return { estimate: mean(xs), low: quantile(means, tail), high: quantile(means, 1 - tail) };
}

/**
 * The difference between two means (with minus without), with a bootstrap
 * range. Each side is resampled on its own, so the two groups may differ
 * in size.
 */
export function differenceRange(withIt: number[], without: number[], level = LEVEL): Range {
  if (withIt.length === 0 || without.length === 0) {
    throw new Error("differenceRange needs values on both sides");
  }
  const rand = seededRandom(seedOf(withIt, without));
  const diffs = Array.from(
    { length: ITERATIONS },
    () => resampleMean(withIt, rand) - resampleMean(without, rand),
  ).sort((a, b) => a - b);
  const tail = (1 - level) / 2;
  return {
    estimate: mean(withIt) - mean(without),
    low: quantile(diffs, tail),
    high: quantile(diffs, 1 - tail),
  };
}

/** Wilson score interval for k successes in n tries, at the given level. */
export function wilson(k: number, n: number, level = LEVEL): Range {
  if (n <= 0) return { estimate: 0, low: 0, high: 1 };
  const z = zFor(level);
  const p = k / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { estimate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

function zFor(level: number): number {
  if (level === 0.9) return 1.6449;
  if (level === 0.95) return 1.96;
  if (level === 0.8) return 1.2816;
  throw new Error(`no z for level ${level}`);
}

/**
 * What a difference range lets us say. "up" and "down" only when the
 * whole range sits on one side of zero; otherwise it is too close to call.
 */
export type Verdict = "up" | "down" | "unclear";

export function verdictOf(r: Range): Verdict {
  if (r.low > 0) return "up";
  if (r.high < 0) return "down";
  return "unclear";
}

/** "+0.6", "-0.3", "0.0": a signed figure to one place, the way a change reads. */
export function signed(x: number): string {
  // Rounded on the size, so -0.25 and +0.25 come out the same distance from zero.
  const size = Math.round(Math.abs(x) * 10) / 10;
  if (size === 0) return "0.0";
  return `${x > 0 ? "+" : "-"}${size.toFixed(1)}`;
}
