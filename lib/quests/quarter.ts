/**
 * Quarter-based time helpers — Ali Abdaal's 90-day Cycle framework.
 *
 * Phases mark where you are in the quarter so the UI can adjust prompts:
 *   Launch (~day 1-9):  set the quests, design the runway
 *   Build  (~day 10-27): foundational work, momentum forming
 *   Grind  (~day 28-63): the long middle, where most of the doing happens
 *   Sprint (~day 64-81): closing pushes, ship the things
 *   Review (~day 82-end): reflect, gather lessons, prep next quarter
 */

export function currentQuarter(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const q = Math.floor(month / 3) + 1;
  return `${year}Q${q}`;
}

export type QuarterPhase = "Launch" | "Build" | "Grind" | "Sprint" | "Review";

export type QuarterProgress = {
  quarter: string;
  day: number;
  totalDays: number;
  pct: number;
  phase: QuarterPhase;
};

export function quarterProgress(date: Date = new Date()): QuarterProgress {
  const year = date.getFullYear();
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const quarterStart = new Date(year, quarterStartMonth, 1);
  const quarterEnd = new Date(year, quarterStartMonth + 3, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const day =
    Math.floor((date.getTime() - quarterStart.getTime()) / dayMs) + 1;
  const totalDays =
    Math.floor((quarterEnd.getTime() - quarterStart.getTime()) / dayMs) + 1;
  const pct = day / totalDays;

  let phase: QuarterPhase = "Launch";
  if (pct > 0.1 && pct <= 0.3) phase = "Build";
  else if (pct > 0.3 && pct <= 0.7) phase = "Grind";
  else if (pct > 0.7 && pct <= 0.9) phase = "Sprint";
  else if (pct > 0.9) phase = "Review";

  return {
    quarter: currentQuarter(date),
    day,
    totalDays,
    pct,
    phase,
  };
}
