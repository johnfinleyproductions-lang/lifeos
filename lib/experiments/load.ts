import { asc, eq, inArray } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosExperimentDays, lifeosExperiments } from "@/lib/db/schema";
import { dayKeyOf, formatDay, todayKey } from "@/lib/time/day";
import {
  addDays,
  allDays,
  asCadence,
  canMark,
  dayNumber,
  dueDays,
  lastDay,
  mainReason,
  phaseOf,
  sentence,
  tally,
  tallyWords,
  timesPerWeek,
  REASON_WORDS,
  type Mark,
  type Phase,
} from "./rules";

export type StripDay = {
  day: string;
  /** "done" | "missed" | "today" | "open" (past, never marked) | "ahead" | "off" (not a due day) */
  state: "done" | "missed" | "today" | "open" | "ahead" | "off";
  /** "Mon 9" */
  label: string;
};

export type FieldNote = { day: string; n: number; label: string; done: boolean; note: string };

/** Everything a screen needs to draw one experiment. Plain data, safe to hand to the client. */
export type ExperimentView = {
  id: string;
  action: string;
  curiosity: string | null;
  cadence: string;
  lengthDays: number;
  sentence: string;
  phase: Phase;
  startDate: string;
  lastDay: string;
  /** "9 November" */
  endsOn: string;
  dayNumber: number;
  round: number;
  strip: StripDay[];
  notes: FieldNote[];
  tally: string;
  /** What kept getting in the way, in words, if one reason stands out. */
  pattern: string | null;
  today: { marked: boolean; done: boolean; note: string; reason: string | null } | null;
  /** Yesterday is inside the run and was never marked. */
  yesterdayOpen: string | null;
  outcome: string | null;
  worked: string | null;
  didNot: string | null;
  nextStep: string | null;
  endedEarly: boolean;
  /** "October" */
  month: string;
};

function view(
  exp: typeof lifeosExperiments.$inferSelect,
  days: (typeof lifeosExperimentDays.$inferSelect)[],
  round: number,
  today: string,
): ExperimentView {
  const marks = new Map<string, Mark & { note: string | null }>();
  for (const d of days) marks.set(d.entryDate, { done: d.done, reason: d.reason, note: d.note });

  const phase = phaseOf(exp, today);
  const end = lastDay(exp.startDate, exp.lengthDays);
  const due = new Set(dueDays(exp.startDate, exp.lengthDays, exp.cadence));
  const loose = timesPerWeek(exp.cadence) !== null;

  const strip: StripDay[] = allDays(exp.startDate, exp.lengthDays).map((day) => {
    const mark = marks.get(day);
    let state: StripDay["state"];
    if (mark?.done) state = "done";
    else if (day === today && phase === "running") state = "today";
    else if (!due.has(day)) state = "off";
    else if (mark && !loose) state = "missed";
    else if (day > today) state = "ahead";
    // On a times-a-week cadence a day without it is just a day.
    else state = loose ? "off" : "open";
    return { day, state, label: formatDay(day, "EEE d") };
  });

  const notes: FieldNote[] = days
    .filter((d) => d.note && d.note.trim())
    .sort((a, b) => (a.entryDate < b.entryDate ? -1 : 1))
    .map((d) => ({
      day: d.entryDate,
      n: dayNumber(exp.startDate, exp.lengthDays, d.entryDate),
      label: formatDay(d.entryDate, "EEE d MMM"),
      done: d.done,
      note: d.note!.trim(),
    }));

  const t = tally(exp, marks, phase === "running" ? today : addDays(end, 1));
  const reason = mainReason(t);
  const todayMark = marks.get(today);
  const yesterday = addDays(today, -1);

  return {
    id: exp.id,
    action: exp.action,
    curiosity: exp.curiosity?.trim() || null,
    cadence: asCadence(exp.cadence),
    lengthDays: exp.lengthDays,
    sentence: sentence(exp),
    phase,
    startDate: exp.startDate,
    lastDay: end,
    endsOn: formatDay(end, "d MMMM"),
    dayNumber: dayNumber(exp.startDate, exp.lengthDays, today),
    round,
    strip,
    notes,
    tally: tallyWords(t, exp.cadence),
    pattern:
      reason && t.reasons[reason] >= 2
        ? `On ${t.reasons[reason]} of the days it did not happen, the reason was the same: ${REASON_WORDS[reason]}.`
        : null,
    today:
      phase === "running"
        ? {
            marked: Boolean(todayMark),
            done: todayMark?.done ?? false,
            note: todayMark?.note ?? "",
            reason: todayMark?.reason ?? null,
          }
        : null,
    yesterdayOpen:
      canMark(exp, yesterday, today) && !marks.has(yesterday) && (due.has(yesterday) || loose)
        ? yesterday
        : null,
    outcome: exp.outcome,
    worked: exp.worked,
    didNot: exp.didNot,
    nextStep: exp.nextStep,
    // Closed on or before its last day: it was stopped, not finished.
    endedEarly: exp.status === "closed" && exp.closedAt !== null && dayKeyOf(exp.closedAt) <= end,
    month: formatDay(exp.startDate, "MMMM"),
  };
}

/** How many rounds came before this one, plus one. */
function roundOf(id: string, byId: Map<string, { previousId: string | null }>): number {
  let n = 1;
  let cursor = byId.get(id)?.previousId ?? null;
  const seen = new Set<string>([id]);
  while (cursor && byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    n++;
    cursor = byId.get(cursor)!.previousId;
  }
  return n;
}

/** Every experiment this person has, as views: the ones in play first, then the shelf. */
export async function loadExperiments(userId: string): Promise<{
  live: ExperimentView[];
  shelf: ExperimentView[];
}> {
  const today = todayKey();
  const all = await db
    .select()
    .from(lifeosExperiments)
    .where(eq(lifeosExperiments.userId, userId))
    .orderBy(asc(lifeosExperiments.createdAt));
  if (all.length === 0) return { live: [], shelf: [] };

  const days = await db
    .select()
    .from(lifeosExperimentDays)
    .where(
      inArray(
        lifeosExperimentDays.experimentId,
        all.map((e) => e.id),
      ),
    );
  const byExp = new Map<string, typeof days>();
  for (const d of days) {
    if (!byExp.has(d.experimentId)) byExp.set(d.experimentId, []);
    byExp.get(d.experimentId)!.push(d);
  }
  const byId = new Map(all.map((e) => [e.id, e]));
  const views = all.map((e) => view(e, byExp.get(e.id) ?? [], roundOf(e.id, byId), today));

  return {
    live: views.filter((v) => v.phase !== "closed"),
    shelf: views.filter((v) => v.phase === "closed").reverse(),
  };
}

/** Only the experiments in play, for Today and the evening page. */
export async function loadLiveExperiments(userId: string): Promise<ExperimentView[]> {
  const today = todayKey();
  const running = await db
    .select()
    .from(lifeosExperiments)
    .where(eq(lifeosExperiments.userId, userId))
    .orderBy(asc(lifeosExperiments.createdAt));
  const live = running.filter((e) => e.status !== "closed");
  if (live.length === 0) return [];
  const days = await db
    .select()
    .from(lifeosExperimentDays)
    .where(
      inArray(
        lifeosExperimentDays.experimentId,
        live.map((e) => e.id),
      ),
    );
  const byId = new Map(running.map((e) => [e.id, e]));
  return live.map((e) =>
    view(
      e,
      days.filter((d) => d.experimentId === e.id),
      roundOf(e.id, byId),
      today,
    ),
  );
}
