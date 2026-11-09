/**
 * Everything one person has put into LifeOS, in a form they can keep.
 *
 * Two shapes of the same data:
 *
 *   - JSON holds every row of every table, exactly as stored. It is the
 *     complete record, and the one to keep as a backup or hand to another
 *     program.
 *   - Markdown is for reading: the journal first, then the days, then the
 *     rest. It opens in any text editor and prints cleanly.
 *
 * The journal is in both. This is the person's own copy of their own
 * writing; the wall that keeps the coach out of the journal is about what
 * the app reads, not what its owner may take away.
 */
import { asc, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import {
  lifeosCompass,
  lifeosConfidenceEntries,
  lifeosDailyCheckins,
  lifeosExperimentDays,
  lifeosExperiments,
  lifeosFocusSessions,
  lifeosHabitCompletions,
  lifeosHabits,
  lifeosJournalEntries,
  lifeosOpenLoops,
  lifeosProtocolRuns,
  lifeosQuests,
  lifeosReframesSeen,
} from "@/lib/db/schema";
import { formatDay, formatInstant } from "@/lib/time/day";
import { OUTCOME_WORDS, sentence, type Outcome } from "@/lib/experiments/rules";

export type ExportData = Awaited<ReturnType<typeof gatherEverything>>;

export async function gatherEverything(userId: string) {
  const [
    checkins,
    habits,
    habitCompletions,
    focusSessions,
    quests,
    compass,
    protocolRuns,
    confidenceEntries,
    reframesSeen,
    journalEntries,
    openLoops,
    experiments,
    experimentDays,
  ] = await Promise.all([
    db.select().from(lifeosDailyCheckins).where(eq(lifeosDailyCheckins.userId, userId)).orderBy(asc(lifeosDailyCheckins.entryDate)),
    db.select().from(lifeosHabits).where(eq(lifeosHabits.userId, userId)).orderBy(asc(lifeosHabits.createdAt)),
    db.select().from(lifeosHabitCompletions).where(eq(lifeosHabitCompletions.userId, userId)).orderBy(asc(lifeosHabitCompletions.completionDate)),
    db.select().from(lifeosFocusSessions).where(eq(lifeosFocusSessions.userId, userId)).orderBy(asc(lifeosFocusSessions.startedAt)),
    db.select().from(lifeosQuests).where(eq(lifeosQuests.userId, userId)).orderBy(asc(lifeosQuests.createdAt)),
    db.select().from(lifeosCompass).where(eq(lifeosCompass.userId, userId)),
    db.select().from(lifeosProtocolRuns).where(eq(lifeosProtocolRuns.userId, userId)).orderBy(asc(lifeosProtocolRuns.runDate)),
    db.select().from(lifeosConfidenceEntries).where(eq(lifeosConfidenceEntries.userId, userId)).orderBy(asc(lifeosConfidenceEntries.createdAt)),
    db.select().from(lifeosReframesSeen).where(eq(lifeosReframesSeen.userId, userId)).orderBy(asc(lifeosReframesSeen.shownAt)),
    db.select().from(lifeosJournalEntries).where(eq(lifeosJournalEntries.userId, userId)).orderBy(asc(lifeosJournalEntries.entryDate), asc(lifeosJournalEntries.createdAt)),
    db.select().from(lifeosOpenLoops).where(eq(lifeosOpenLoops.userId, userId)).orderBy(asc(lifeosOpenLoops.openedAt)),
    db.select().from(lifeosExperiments).where(eq(lifeosExperiments.userId, userId)).orderBy(asc(lifeosExperiments.createdAt)),
    db.select().from(lifeosExperimentDays).where(eq(lifeosExperimentDays.userId, userId)).orderBy(asc(lifeosExperimentDays.entryDate)),
  ]);
  return {
    checkins,
    habits,
    habitCompletions,
    focusSessions,
    quests,
    compass,
    protocolRuns,
    confidenceEntries,
    reframesSeen,
    journalEntries,
    openLoops,
    experiments,
    experimentDays,
  };
}

export function toJson(
  person: { name: string; email: string },
  data: ExportData,
  exportedAt: Date,
): string {
  return (
    JSON.stringify(
      {
        app: "LifeOS",
        format: 1,
        exportedAt: exportedAt.toISOString(),
        person,
        counts: Object.fromEntries(
          Object.entries(data).map(([name, rows]) => [name, rows.length]),
        ),
        ...data,
      },
      null,
      2,
    ) + "\n"
  );
}

// ─── Markdown ───────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  energy: "Energy",
  mood: "Mood",
  priorities: "The three",
  manifesto: "Manifesto",
  protect: "Protecting",
  gratitude: "Thankful for",
  dayRating: "Day rating",
  dayMood: "Mood",
  prioritiesDone: "Struck",
  win: "Win",
  lesson: "Lesson",
  tomorrowSeed: "Seed for tomorrow",
  reframe: "Reframe",
  release: "Released",
};

function words(key: string): string {
  return (
    LABELS[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/^./, (c) => c.toUpperCase())
  );
}

function plain(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "boolean" ? (item ? "done" : "open") : plain(item))).join("; ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      // Keys that start with an underscore are bookkeeping (when a sheet was
    // written, for the offline outbox), not something the person wrote.
    .filter(([k, v]) => !k.startsWith("_") && plain(v) !== "")
      .map(([k, v]) => `${words(k)}: ${plain(v)}`)
      .join("; ");
  }
  return String(value);
}

/** A stored sheet (morning, evening, a protocol's answers) as a short list. */
function sheet(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    // Keys that start with an underscore are bookkeeping (when a sheet was
    // written, for the offline outbox), not something the person wrote.
    .filter(([k, v]) => !k.startsWith("_") && plain(v) !== "")
    .map(([k, v]) => `- ${words(k)}: ${plain(v)}`);
}

const day = (key: string) => formatDay(key, "EEEE, d MMMM yyyy");
const clock = (d: Date) => formatInstant(d, "h:mm a");

export function toMarkdown(
  person: { name: string; email: string },
  data: ExportData,
  exportedAt: Date,
): string {
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    `# LifeOS: ${person.name}`,
    "",
    `Exported ${formatInstant(exportedAt, "d MMMM yyyy 'at' h:mm a")}.`,
    "",
    `${data.journalEntries.length} journal entries, ${data.checkins.length} days, ${data.habits.length} habits, ${data.focusSessions.length} focus sessions, ${data.quests.length} quests.`,
    "",
  );

  push("## Journal", "");
  if (data.journalEntries.length === 0) push("Nothing written yet.", "");
  for (const entry of data.journalEntries) {
    const tags = [entry.mode, entry.frameworkLens, entry.isDecision ? "decision" : null].filter(Boolean).join(", ");
    push(`### ${day(entry.entryDate)}, ${clock(entry.createdAt)}`, "", `_${tags}_`, "", entry.body.trim(), "");
    if (entry.isDecision && entry.decisionSummary) {
      const door = entry.decisionDoor ? ` (${entry.decisionDoor.replace("_", "-")} door)` : "";
      push(`**Decided:** ${entry.decisionSummary}${door}`, "");
    }
  }

  if (data.openLoops.length > 0) {
    push("## Open questions", "");
    for (const loop of data.openLoops) {
      const closed = loop.resolvedAt ? ` Closed: ${loop.resolutionNote ?? "yes"}.` : "";
      push(`- ${loop.question} (${loop.status}).${closed}`);
    }
    push("");
  }

  push("## Days", "");
  if (data.checkins.length === 0) push("No days set yet.", "");
  for (const checkin of data.checkins) {
    push(`### ${day(checkin.entryDate)}`, "");
    const morning = sheet(checkin.morning);
    const evening = sheet(checkin.evening);
    if (morning.length) push("**Morning**", "", ...morning, "");
    if (evening.length) push("**Evening**", "", ...evening, "");
  }

  if (data.habits.length > 0) {
    push("## Habits", "");
    for (const habit of data.habits) {
      const days = data.habitCompletions.filter((c) => c.habitId === habit.id).map((c) => c.completionDate);
      push(`### ${habit.name}`, "", `${habit.cadence}${habit.archived ? ", archived" : ""}. Kept on ${days.length} ${days.length === 1 ? "day" : "days"}.`, "");
      if (days.length) push(days.join(", "), "");
    }
  }

  if (data.experiments.length > 0) {
    push("## Experiments", "");
    for (const exp of data.experiments) {
      const marks = data.experimentDays.filter((d) => d.experimentId === exp.id);
      const done = marks.filter((d) => d.done).length;
      push(`### ${sentence(exp)}`, "");
      push(
        `Started ${day(exp.startDate)}. Done ${done} ${done === 1 ? "time" : "times"}. ` +
          (exp.status === "closed"
            ? `Ended: ${OUTCOME_WORDS[(exp.outcome ?? "paused") as Outcome] ?? exp.outcome}.`
            : "Still running."),
        "",
      );
      if (exp.curiosity) push(`Curious whether ${exp.curiosity}`, "");
      for (const m of marks) {
        if (m.note) push(`- ${formatDay(m.entryDate, "d MMM")}, ${m.done ? "done" : "not done"}: ${m.note}`);
      }
      if (marks.some((m) => m.note)) push("");
      if (exp.worked) push(`What worked: ${exp.worked}`, "");
      if (exp.didNot) push(`What did not: ${exp.didNot}`, "");
      if (exp.nextStep) push(`What next: ${exp.nextStep}`, "");
    }
  }

  if (data.focusSessions.length > 0) {
    push("## Focus", "");
    for (const session of data.focusSessions) {
      const minutes = session.durationMinutes === null ? "still open" : `${session.durationMinutes} min`;
      push(`- ${formatInstant(session.startedAt, "d MMM yyyy, h:mm a")}: ${session.label} (${minutes})${session.note ? `. ${session.note}` : ""}`);
    }
    push("");
  }

  if (data.quests.length > 0) {
    push("## Quests", "");
    for (const quest of data.quests) {
      push(`- ${quest.quarter}, ${quest.domain}, ${quest.type}: **${quest.title}** (${quest.status}, ${quest.progress}%)${quest.description ? `. ${quest.description}` : ""}`);
    }
    push("");
  }

  const compass = data.compass[0];
  if (compass) {
    push("## Compass", "");
    if (compass.mission) push("**Mission**", "", compass.mission, "");
    if (compass.successDefinition) push("**Success, defined**", "", compass.successDefinition, "");
    if (compass.eulogy) push("**Eulogy**", "", compass.eulogy, "");
    const paths = sheet(compass.futurePaths);
    if (paths.length) push("**Future paths**", "", ...paths, "");
    const week = sheet(compass.idealWeek);
    if (week.length) push("**Ideal week**", "", ...week, "");
  }

  if (data.protocolRuns.length > 0) {
    push("## Protocols", "");
    for (const run of data.protocolRuns) {
      push(`### ${run.slug}, ${day(run.runDate)}`, "", ...sheet(run.payload), "");
    }
  }

  if (data.confidenceEntries.length > 0) {
    push("## Confidence file", "");
    for (const item of data.confidenceEntries) {
      push(`- ${formatInstant(item.createdAt, "d MMM yyyy")}: **${item.title}**${item.body ? `. ${item.body}` : ""}`);
    }
    push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
