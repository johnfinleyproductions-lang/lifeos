import { format } from "date-fns";
import type { InsightsData } from "./queries";

export type Pattern = {
  emoji: string;
  title: string;
  body: string;
};

/**
 * Detect simple patterns from the aggregated data. Generates 1-line
 * callouts the user can read at a glance — "best day this period",
 * "most consistent habit", "average rating", "focus consistency",
 * "reflection cadence".
 *
 * Conservative — only emits a pattern when there's enough data to back
 * the claim. Empty period → empty list.
 */
export function detectPatterns(data: InsightsData): Pattern[] {
  const patterns: Pattern[] = [];

  // Best day rating
  const bestDay = [...data.dayPoints]
    .filter((p) => p.eveningRating !== null)
    .sort((a, b) => (b.eveningRating ?? 0) - (a.eveningRating ?? 0))[0];
  if (bestDay && bestDay.eveningRating && bestDay.eveningRating >= 4) {
    const dateLabel = format(new Date(bestDay.date), "EEEE, MMM d");
    patterns.push({
      emoji: "🌟",
      title: "Best day this period",
      body: `${dateLabel} — you rated it ${bestDay.eveningRating}/5${
        bestDay.eveningMood ? `, mood: ${bestDay.eveningMood}` : ""
      }.`,
    });
  }

  // Most consistent habit
  if (data.habits.length > 0) {
    const sorted = [...data.habits].sort(
      (a, b) => b.completions.size - a.completions.size,
    );
    const top = sorted[0];
    if (top.completions.size > 0) {
      const pct = Math.round(
        (top.completions.size / data.windowDays) * 100,
      );
      patterns.push({
        emoji: "🔁",
        title: "Most consistent habit",
        body: `"${top.name}" — hit ${top.completions.size} of ${data.windowDays} days (${pct}%).`,
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
          : "Tough period — what's draining?";
    patterns.push({
      emoji: "📊",
      title: "Average day rating",
      body: `${fmt}/5 across ${ratings.length} evening shutdowns. ${tone}`,
    });
  }

  // Focus consistency
  const focusDays = data.dayPoints.filter((p) => p.focusMinutes >= 30).length;
  if (focusDays >= 3) {
    patterns.push({
      emoji: "🎯",
      title: "Focus consistency",
      body: `${focusDays} of ${data.windowDays} days had 30+ focus minutes. That's a real practice forming.`,
    });
  }

  // Reflection cadence
  if (data.morningCheckins >= 3 || data.eveningCheckins >= 3) {
    const ratio = data.eveningCheckins / data.windowDays;
    const tone =
      ratio >= 0.5
        ? "You're showing up."
        : "Worth being gentle on the gaps.";
    patterns.push({
      emoji: "📝",
      title: "Reflection cadence",
      body: `${data.morningCheckins} morning + ${data.eveningCheckins} evening check-ins this period. ${tone}`,
    });
  }

  // Decisions logged
  if (data.decisionCount >= 1) {
    patterns.push({
      emoji: "🎲",
      title: "Decisions logged",
      body: `${data.decisionCount} ${
        data.decisionCount === 1 ? "decision" : "decisions"
      } captured in your journal this period. Pattern-spot at /journal/decisions.`,
    });
  }

  return patterns.slice(0, 4);
}
