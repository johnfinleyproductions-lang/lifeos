import { and, eq, inArray } from "drizzle-orm";
import { dayKeyOf, formatDay, lastNDays, todayKey } from "@/lib/time/day";
import { keptIn } from "@/lib/habits/cadence";
import { db } from "@/lib/db";
import {
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { pressingsFor } from "@/lib/habits/pressings";
import { fieldMarksShown } from "@/lib/collection/field-marks";
import { HabitsClient } from "@/components/habits/HabitsClient";
import { PageStamp } from "@/components/PageStamp";

export default async function HabitsPage() {
  const { user } = await requireUserContext();

  const [habits, marks] = await Promise.all([
    db
      .select()
      .from(lifeosHabits)
      .where(
        and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)),
      )
      .orderBy(lifeosHabits.createdAt),
    fieldMarksShown(),
  ]);

  // Every completion, not just the week's: the specimen label needs the
  // lifetime count, the first date, and the longest run. One habit a day
  // for three years is about a thousand rows, which is nothing.
  const today = todayKey();
  const completions =
    habits.length > 0
      ? await db
          .select({
            habitId: lifeosHabitCompletions.habitId,
            date: lifeosHabitCompletions.completionDate,
          })
          .from(lifeosHabitCompletions)
          .where(
            inArray(
              lifeosHabitCompletions.habitId,
              habits.map((h) => h.id),
            ),
          )
      : [];

  // Map habitId -> every completion date
  const datesByHabit = new Map<string, string[]>();
  for (const c of completions) {
    if (!datesByHabit.has(c.habitId)) datesByHabit.set(c.habitId, []);
    datesByHabit.get(c.habitId)!.push(c.date);
  }

  // Last 7 days, oldest first so the strip reads left-to-right naturally
  const days = lastNDays(7, today).map((d) => ({
    date: d,
    label: formatDay(d, "EEEEEE"), // Mo, Tu, We
  }));

  const windowKeys = days.map((d) => d.date);

  const habitsWithCompletions = habits.map((h) => {
    const dates = datesByHabit.get(h.id) ?? [];
    const set = new Set(dates);
    // A habit cannot have missed a day it did not exist for.
    const since = h.createdAt ? dayKeyOf(h.createdAt) : null;
    return {
      id: h.id,
      name: h.name,
      cadence: h.cadence,
      description: h.description,
      last7Days: days.map((d) => ({ ...d, done: set.has(d.date) })),
      pressings: marks ? pressingsFor(dates, h.cadence) : null,
      kept: keptIn(h.cadence, since, windowKeys, set),
    };
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageStamp
        title="Habits"
        subtitle="The small things you keep doing."
      />

      <HabitsClient habits={habitsWithCompletions} />
    </div>
  );
}
