import Link from "next/link";
import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { format, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosFocusSessions,
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";

export async function FocusHabitsCard() {
  const { user } = await getAuthContext();

  if (!user) {
    return (
      <div className="card">
        <div className="card-glow" />
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
          Today&apos;s tracking
        </div>
        <div className="font-serif text-lg text-ink-100">— focus, — habits</div>
        <p className="text-xs text-ink-400 mt-2">
          Sign in to see today&apos;s focus and habit stats.
        </p>
      </div>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const dayStart = startOfDay(new Date());

  const focusSessions = await db
    .select()
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNotNull(lifeosFocusSessions.endedAt),
        gte(lifeosFocusSessions.startedAt, dayStart),
      ),
    );
  const focusMinutes = focusSessions.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0,
  );

  const [habitsCountRow] = await db
    .select({ value: count() })
    .from(lifeosHabits)
    .where(
      and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)),
    );
  const habitCount = Number(habitsCountRow?.value ?? 0);

  const [completionsRow] = await db
    .select({ value: count() })
    .from(lifeosHabitCompletions)
    .where(
      and(
        eq(lifeosHabitCompletions.userId, user.id),
        eq(lifeosHabitCompletions.completionDate, today),
      ),
    );
  const completionCount = Number(completionsRow?.value ?? 0);

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        Today&apos;s tracking
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/focus"
          className="block p-3 -m-3 rounded-lg hover:bg-white/5 transition"
        >
          <div className="font-serif text-3xl text-ink-50 tabular-nums">
            {focusMinutes}
            <span className="text-sm text-ink-400 ml-1">min</span>
          </div>
          <div className="text-[11px] text-accent-sky uppercase tracking-wider mt-1">
            Focus
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            {focusSessions.length}{" "}
            {focusSessions.length === 1 ? "session" : "sessions"}
          </div>
        </Link>
        <Link
          href="/habits"
          className="block p-3 -m-3 rounded-lg hover:bg-white/5 transition"
        >
          <div className="font-serif text-3xl text-ink-50 tabular-nums">
            {completionCount}
            <span className="text-sm text-ink-400">/{habitCount}</span>
          </div>
          <div className="text-[11px] text-accent-green uppercase tracking-wider mt-1">
            Habits
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            {habitCount === 0
              ? "none yet"
              : completionCount === habitCount
                ? "all done"
                : `${habitCount - completionCount} to go`}
          </div>
        </Link>
      </div>
    </div>
  );
}
