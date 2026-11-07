import Link from "next/link";
import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { startOfDay, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import {
  lifeosFocusSessions,
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";

function Tile({
  href,
  label,
  value,
  unit,
  foot,
  spot,
}: {
  href: string;
  label: string;
  value: number;
  unit?: string;
  foot: string;
  spot?: boolean;
}) {
  return (
    <Link href={href} className="block group">
      <div className="stat-l">{label}</div>
      <div className={`stat-v ${spot ? "text-accent-spot" : ""}`}>
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="stat-f group-hover:text-accent-spot">{foot}</div>
    </Link>
  );
}

export async function FocusHabitsCard() {
  const { user } = await getAuthContext();

  if (!user) {
    return (
      <div className="sheet">
        <div className="tab-row">
          <span className="tab">Today</span>
          <span className="fill" />
        </div>
        <p className="t-read text-ink-300 m-0">
          Pick a profile to see the day&apos;s focus and habits.
        </p>
      </div>
    );
  }

  const today = todayKey();
  const dayStart = startOfDay(today);

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
    <div className="sheet">
      <div className="tab-row">
        <span className="tab">Today</span>
        <span className="fill" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Tile
          href="/focus"
          label="Focus logged"
          value={focusMinutes}
          unit="min"
          spot={focusMinutes > 0}
          foot={`${focusSessions.length} ${
            focusSessions.length === 1 ? "session" : "sessions"
          }`}
        />
        <Tile
          href="/habits"
          label="Habits struck"
          value={completionCount}
          unit={`/${habitCount}`}
          foot={
            habitCount === 0
              ? "None set up yet"
              : completionCount === habitCount
                ? "All of them"
                : `${habitCount - completionCount} to go`
          }
        />
      </div>
    </div>
  );
}
