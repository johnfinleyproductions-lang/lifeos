import { and, eq, gte, inArray } from "drizzle-orm";
import { addDays, formatDay, lastNDays, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import {
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { HabitsClient } from "@/components/habits/HabitsClient";
import { PageStamp } from "@/components/PageStamp";

export default async function HabitsPage() {
  const { user } = await requireUserContext();

  const habits = await db
    .select()
    .from(lifeosHabits)
    .where(
      and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)),
    )
    .orderBy(lifeosHabits.createdAt);

  const today = todayKey();
  const sevenDaysAgo = addDays(today, -6);
  const completions =
    habits.length > 0
      ? await db
          .select()
          .from(lifeosHabitCompletions)
          .where(
            and(
              inArray(
                lifeosHabitCompletions.habitId,
                habits.map((h) => h.id),
              ),
              gte(lifeosHabitCompletions.completionDate, sevenDaysAgo),
            ),
          )
      : [];

  // Map habitId -> Set of completion date strings
  const completionsByHabit = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!completionsByHabit.has(c.habitId)) {
      completionsByHabit.set(c.habitId, new Set());
    }
    completionsByHabit.get(c.habitId)!.add(c.completionDate);
  }

  // Last 7 days, oldest first so the strip reads left-to-right naturally
  const days = lastNDays(7, today).map((d) => ({
    date: d,
    label: formatDay(d, "EEEEEE"), // Mo, Tu, We
  }));

  const habitsWithCompletions = habits.map((h) => ({
    id: h.id,
    name: h.name,
    cadence: h.cadence,
    description: h.description,
    last7Days: days.map((d) => ({
      ...d,
      done: completionsByHabit.get(h.id)?.has(d.date) ?? false,
    })),
  }));

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
