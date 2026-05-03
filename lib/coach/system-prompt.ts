import { format } from "date-fns";
import type { CoachContext } from "./context";

/**
 * Build the system prompt for the AI coach.
 *
 * The voice: warm, direct, MIND-OS-trained. Not corporate, not therapy-speak.
 * Reads the user's actual data and uses it. Doesn't make stuff up.
 *
 * Critical line in the prompt: tells Claude that journal data is invisible.
 * This is reinforced at the architecture level (this file never imports
 * journal schemas), but stating it in the prompt also nudges the model
 * not to ask leading questions about journaling.
 */
export function buildSystemPrompt(
  user: { name: string },
  ctx: CoachContext,
): string {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const firstName = user.name.split(" ")[0];

  const lines: string[] = [];

  lines.push(
    `You are LifeOS Coach — a thoughtful, warm voice inside ${firstName}'s personal operating system.`,
    "",
    `Your job: help ${firstName} think clearly about their day, their quests, their balance. You read their actual data (below). When asked something you don't have data for, say so — don't invent. You write like a smart friend who has been paying attention. Direct, occasionally playful. Hold space for the inner work but stay grounded in what's true today.`,
    "",
    `IMPORTANT — privacy boundary: you can see check-ins, quests, habits, focus sessions, balance scores, and confidence file entries. You CANNOT see ${firstName}'s journal entries — those are private writing space and the system never shows them to you. Don't ask about journal contents. If they bring up something they wrote in their journal, just engage with what they share, don't probe for the underlying entry.`,
    "",
    `Reply concisely. 1-3 short paragraphs unless they ask for depth. Use their actual data. When useful, ask one good question.`,
    "",
    "===== TODAY'S CONTEXT =====",
    "",
    `Today is ${today}.`,
    `Quarter: day ${ctx.quarterDay} of ${ctx.quarterTotalDays} (${ctx.quarterPhase} phase).`,
    "",
  );

  if (ctx.identityStatement) {
    lines.push(
      `Identity statement (most recent morning manifesto):`,
      `  "${ctx.identityStatement}"`,
      "",
    );
  } else {
    lines.push(`Identity statement: not set yet.`, "");
  }

  if (ctx.todayMorning) {
    const m = ctx.todayMorning;
    lines.push(
      `Morning manifesto (today): DONE.`,
      `  Energy: ${m.energy}/5, mood: ${m.mood}.`,
      `  Priorities: ${m.priorities.map((p) => `"${p}"`).join("; ")}.`,
      `  Protect: "${m.protect}".`,
      `  Gratitude: "${m.gratitude}".`,
      "",
    );
  } else {
    lines.push(`Morning manifesto (today): not done yet.`, "");
  }

  if (ctx.todayEvening) {
    const e = ctx.todayEvening;
    lines.push(
      `Evening shutdown (today): DONE.`,
      `  Day rating: ${e.dayRating}/5, mood: ${e.dayMood}.`,
      `  Win: "${e.win}".`,
      `  Lesson: "${e.lesson}".`,
      `  Tomorrow seed: "${e.tomorrowSeed}".`,
      "",
    );
  } else {
    lines.push(`Evening shutdown (today): not done yet.`, "");
  }

  if (ctx.activeQuests.length > 0) {
    lines.push(`Active quests:`);
    for (const q of ctx.activeQuests) {
      lines.push(`  - [${q.domain}/${q.type}] "${q.title}" — ${q.progress}%`);
    }
    lines.push("");
  } else {
    lines.push(`Active quests: none set yet.`, "");
  }

  lines.push(
    `Last 7-day discipline:`,
    `  Morning checkins: ${ctx.scorecard.morningDays}/7`,
    `  Evening checkins: ${ctx.scorecard.eveningDays}/7`,
    `  Habit completion: ${ctx.scorecard.habitPct}% (${ctx.scorecard.habitCompletions} of ${ctx.scorecard.habitTotal || "—"})`,
    `  Focus minutes: ${ctx.scorecard.focusMinutes} across ${ctx.scorecard.focusSessions} sessions`,
    `  Quest avg progress: ${ctx.scorecard.questAvgProgress}%`,
    "",
  );

  if (ctx.balance) {
    lines.push(
      `Balance scores (most recent weekly review):`,
      `  Mind ${ctx.balance.mind}/10, Body ${ctx.balance.body}/10, Work ${ctx.balance.work}/10, Relationships ${ctx.balance.relationships}/10, Play ${ctx.balance.play}/10, Spirit ${ctx.balance.spirit}/10`,
      "",
    );
  } else {
    lines.push(`Balance scores: no weekly review yet.`, "");
  }

  if (ctx.recentConfidence.length > 0) {
    lines.push(`Recent confidence file entries (last 5):`);
    for (const c of ctx.recentConfidence) {
      const date = format(new Date(c.createdAt), "MMM d");
      lines.push(`  - [${date}] ${c.title}${c.body ? `: "${c.body}"` : ""}`);
    }
    lines.push("");
  }

  lines.push(`===== END CONTEXT =====`);

  return lines.join("\n");
}
