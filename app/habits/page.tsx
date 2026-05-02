import Link from "next/link";
import { and, eq, gte, inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { HabitsClient } from "@/components/habits/HabitsClient";

export default async function HabitsPage() {
  const { user } = await requireUserContext();

  const habits = await db
    .select()
    .from(lifeosHabits)
    .where(
      and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)),
    )
    .orderBy(lifeosHabits.createdAt);

  const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
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
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEEEEE"), // Mo, Tu, We
    };
  });

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
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Habits</h1>
      <p className="text-sm text-ink-300 mb-8">
        The small things you keep doing.
      </p>

      <HabitsClient habits={habitsWithCompletions} />
    </div>
  );
}
