import Link from "next/link";
import { and, eq, gte, inArray, isNotNull } from "@/lib/db/ops";
import { startOfDay, todayKey, weekdayOf } from "@/lib/time/day";
import { cadenceOf, isoWeekOf } from "@/lib/insights/habit-denominator";
import { db } from "@/lib/db";
import {
  lifeosFocusSessions,
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/server-helpers";

function Tile({
  href,
  label,
  value,
  unit,
  foot,
}: {
  href: string;
  label: string;
  value: number;
  unit?: string;
  foot: string;
}) {
  // Ink, not spot: 30px orange on the panel is 2.6:1 by day, under the
  // 3:1 floor for large type, and a logged total is a record rather
  // than something happening now.
  return (
    <Link href={href} className="block group">
      <div className="stat-l">{label}</div>
      <div className="stat-v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="stat-f group-hover:underline decoration-accent-spot decoration-2">
        {foot}
      </div>
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

  // Which habits are due today is a question of cadence, not a count of
  // rows. A weekdays habit is not due on a Saturday; a weekly habit is
  // due this week, and once it has been struck on any day of the week
  // it is kept, not still owed. A habit created after today never
  // appears here, and one created today is due today.
  const habitRows = await db
    .select({
      id: lifeosHabits.id,
      cadence: lifeosHabits.cadence,
      createdAt: lifeosHabits.createdAt,
    })
    .from(lifeosHabits)
    .where(
      and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)),
    );

  const weekStart = isoWeekOf(today);
  const completionRows =
    habitRows.length > 0
      ? await db
          .select({
            habitId: lifeosHabitCompletions.habitId,
            date: lifeosHabitCompletions.completionDate,
          })
          .from(lifeosHabitCompletions)
          .where(
            and(
              inArray(
                lifeosHabitCompletions.habitId,
                habitRows.map((h) => h.id),
              ),
              gte(lifeosHabitCompletions.completionDate, weekStart),
            ),
          )
      : [];
  const struckToday = new Set(
    completionRows.filter((c) => c.date === today).map((c) => c.habitId),
  );
  const struckThisWeek = new Set(completionRows.map((c) => c.habitId));

  const dow = weekdayOf(today);
  const weekend = dow === 0 || dow === 6;

  let due = 0;
  let kept = 0;
  let weeklyKeptEarlier = 0;
  for (const h of habitRows) {
    const cadence = cadenceOf(h.cadence);
    if (cadence === "weekdays" && weekend) continue;
    if (cadence === "weekly") {
      if (struckToday.has(h.id)) {
        due += 1;
        kept += 1;
      } else if (struckThisWeek.has(h.id)) {
        weeklyKeptEarlier += 1;
      } else {
        due += 1;
      }
      continue;
    }
    due += 1;
    if (struckToday.has(h.id)) kept += 1;
  }
  const habitCount = habitRows.length;
  const toGo = due - kept;
  const dueFoot =
    habitCount === 0
      ? "None set up yet"
      : due === 0
        ? weeklyKeptEarlier > 0
          ? "Nothing due today; the weekly one is kept"
          : "Nothing due today"
        : toGo === 0
          ? weeklyKeptEarlier > 0
            ? "All that was due; the weekly one is kept"
            : "All that was due"
          : `${toGo} to go${
              weeklyKeptEarlier > 0 ? ", weekly already kept" : ""
            }`;

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
          foot={`${focusSessions.length} ${
            focusSessions.length === 1 ? "session" : "sessions"
          }`}
        />
        <Tile
          href="/habits"
          label="Due today"
          value={kept}
          unit={due > 0 ? `/${due}` : undefined}
          foot={dueFoot}
        />
      </div>
    </div>
  );
}
