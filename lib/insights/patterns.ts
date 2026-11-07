import { formatDay } from "@/lib/time/day";
import type { InsightsData } from "./queries";

export type Pattern = {
  emoji: string;
  title: string;
  body: string;
};

/**
 * Detect simple patterns from the aggregated data. Generates 1-line
 * callouts the user can read at a glance: "best day this period",
 * "most consistent habit", "average rating", "focus consistency",
 * "reflection cadence".
 *
 * Conservative: only emits a pattern when there is enough data to back
 * the claim. Empty period, empty list. The sentences are set in the
 * house style, which has no em dashes.
 */
export function detectPatterns(data: InsightsData): Pattern[] {
  const patterns: Pattern[] = [];

  // Best day rating
  const bestDay = [...data.dayPoints]
    .filter((p) => p.eveningRating !== null)
    .sort((a, b) => (b.eveningRating ?? 0) - (a.eveningRating ?? 0))[0];
  if (bestDay && bestDay.eveningRating && bestDay.eveningRating >= 4) {
    const dateLabel = formatDay(bestDay.date, "EEEE, MMM d");
    patterns.push({
      emoji: "🌟",
      title: "Best day this period",
      body: `${dateLabel}, rated ${bestDay.eveningRating} of 5${
        bestDay.eveningMood ? `, ${bestDay.eveningMood}` : ""
      }.`,
    });
  }

  // Most consistent habit, measured against what its cadence asked for
  // and only from the day it existed. A weekly habit kept every week
  // ranks level with a daily habit kept every day.
  if (data.habits.length > 0) {
    const ranked = [...data.habits]
      .filter((h) => h.tally.possible > 0 && h.tally.kept > 0)
      .sort(
        (a, b) =>
          b.tally.kept / b.tally.possible - a.tally.kept / a.tally.possible ||
          b.tally.kept - a.tally.kept,
      );
    const top = ranked[0];
    if (top) {
      const t = top.tally;
      const body =
        t.unit === "weeks"
          ? data.windowDays <= 7
            ? `"${top.name}", kept this week.`
            : `"${top.name}", kept ${t.kept} of ${t.possible} weeks.`
          : `"${top.name}", kept ${t.kept} of the ${t.possible} ${
              t.possible === 1 ? "day" : "days"
            } it was due.`;
      patterns.push({
        emoji: "🔁",
        title: "Most consistent habit",
        body,
      });
    }
  }

  // Average day rating
  const ratings = data.dayPoints
    .map((p) => p.eveningRating)
    .filter((r): r is number => r !== null);
  if (ratings.length >= 3) {
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    const fmt = avg.toFixed(1);
    const tone =
      avg >= 4
        ? "Strong period."
        : avg >= 3
          ? "Steady period."
          : "A rough stretch. Worth asking what is draining.";
    patterns.push({
      emoji: "📊",
      title: "Average day rating",
      body: `${fmt}/5 across ${ratings.length} evening shutdowns. ${tone}`,
    });
  }

  // Focus consistency
  const focusDays = data.dayPoints.filter((p) => p.focusMinutes >= 30).length;
  const span = Math.max(data.activeDays, 1);
  if (focusDays >= 3) {
    patterns.push({
      emoji: "🎯",
      title: "Focus consistency",
      body: `${focusDays} of ${span} days had half an hour or more of focus. A practice is forming.`,
    });
  }

  // Reflection cadence
  if (data.morningCheckins >= 3 || data.eveningCheckins >= 3) {
    const ratio = data.eveningCheckins / Math.max(data.activeDays, 1);
    const tone =
      ratio >= 0.5
        ? "You're showing up."
        : "The gaps are fine. The record is what counts.";
    patterns.push({
      emoji: "📝",
      title: "Reflection cadence",
      body: `${data.morningCheckins} morning and ${data.eveningCheckins} evening check-ins this period. ${tone}`,
    });
  }

  // Decisions logged
  if (data.decisionCount >= 1) {
    patterns.push({
      emoji: "🎲",
      title: "Decisions logged",
      body: `${data.decisionCount} ${
        data.decisionCount === 1 ? "decision" : "decisions"
      } tagged in the journal this period.`,
    });
  }

  return patterns.slice(0, 4);
}
