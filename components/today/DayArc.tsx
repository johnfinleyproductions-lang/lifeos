import { and, eq, gte, lt } from "@/lib/db/ops";
import { db } from "@/lib/db";
import {
  lifeosDailyCheckins,
  lifeosFocusSessions,
} from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { Plate } from "@/components/field/plates";
import {
  endOfDay,
  formatInstant,
  now,
  startOfDay,
  todayKey,
} from "@/lib/time/day";

/**
 * The day, plotted: a strip from the start of the household day to its
 * end with the day's own marks set along it. When it was set, each sit
 * in the hide as a hatched block, where the hour hand is now, and when
 * it was closed.
 *
 * Today used to be told apart from yesterday by its date and nothing
 * else. This is the one mark on the page that moves while you watch,
 * which is why the hand is the only orange on it.
 *
 * The set and closed times are the check-in row's created_at and
 * updated_at. Those are when the row was first written and last written,
 * which is the morning and the evening on any ordinary day; a morning
 * revised after the shutdown would move the closed mark, and that is
 * accepted rather than adding two columns to store it exactly.
 */
export async function DayArc() {
  const { user } = await getAuthContext();
  if (!user) return null;

  const today = todayKey();
  const start = startOfDay(today);
  const end = endOfDay(today);
  const span = end.getTime() - start.getTime();

  const [rows, sessions] = await Promise.all([
    db
      .select({
        morning: lifeosDailyCheckins.morning,
        evening: lifeosDailyCheckins.evening,
        createdAt: lifeosDailyCheckins.createdAt,
        updatedAt: lifeosDailyCheckins.updatedAt,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, user.id),
          eq(lifeosDailyCheckins.entryDate, today),
        ),
      )
      .limit(1),
    db
      .select({
        startedAt: lifeosFocusSessions.startedAt,
        endedAt: lifeosFocusSessions.endedAt,
      })
      .from(lifeosFocusSessions)
      .where(
        and(
          eq(lifeosFocusSessions.userId, user.id),
          gte(lifeosFocusSessions.startedAt, start),
          lt(lifeosFocusSessions.startedAt, end),
        ),
      ),
  ]);

  const at = now();
  const pct = (d: Date) =>
    Math.min(100, Math.max(0, ((d.getTime() - start.getTime()) / span) * 100));
  const inDay = (d: Date) => d >= start && d < end;
  const clock = (d: Date) => formatInstant(d, "h:mm a").toLowerCase();

  const row = rows[0];
  const setAt = row?.morning && inDay(row.createdAt) ? row.createdAt : null;
  const closedAt = row?.evening && inDay(row.updatedAt) ? row.updatedAt : null;

  // Hour marks every three hours, as instants, so a 23- or 25-hour day
  // prints the hours it really has.
  const hours: Date[] = [];
  for (let t = start.getTime() + 2 * 3_600_000; t < end.getTime(); t += 3 * 3_600_000) {
    hours.push(new Date(t));
  }

  const blocks = sessions.map((s) => {
    const to = s.endedAt ?? at;
    return {
      left: pct(s.startedAt),
      width: Math.max(0.4, pct(to) - pct(s.startedAt)),
      live: s.endedAt === null,
    };
  });
  const sat = sessions.filter((s) => s.endedAt !== null).length;

  // One sentence under the strip, built only from what is on it.
  const parts: string[] = [];
  if (setAt) parts.push(`set at ${clock(setAt)}`);
  if (sat > 0) parts.push(`${sat === 1 ? "one sit" : `${sat} sits`} in the hide`);
  if (blocks.some((b) => b.live)) parts.push("one running");
  if (closedAt) parts.push(`closed at ${clock(closedAt)}`);
  const legend = parts.length
    ? parts.join(", ").replace(/^./, (c) => c.toUpperCase()) + "."
    : "Nothing on the strip yet.";

  // the dark hours: before six and after eight, stippled
  const dawn = pct(new Date(start.getTime() + 2 * 3_600_000));
  const dusk = pct(new Date(start.getTime() + 16 * 3_600_000));

  return (
    <section aria-label="The day, plotted" className="mb-6">
      <div className="arc" role="img" aria-label={`${legend} The hand is at ${clock(at)}.`}>
        <div className="arc-track">
          <span className="arc-dark" style={{ left: 0, width: `${dawn}%` }} />
          <span className="arc-dark" style={{ left: `${dusk}%`, right: 0 }} />
        </div>
        {blocks.map((b, i) => (
          <span
            key={i}
            className={b.live ? "arc-block arc-block-live" : "arc-block"}
            style={{ left: `${b.left}%`, width: `${b.width}%` }}
          />
        ))}
        {hours.map((h) => (
          <span key={h.getTime()}>
            <span className="arc-tick" style={{ left: `${pct(h)}%` }} />
            <span className="arc-hour" style={{ left: `${pct(h)}%` }}>
              {formatInstant(h, "h a").replace(" ", "").toLowerCase()}
            </span>
          </span>
        ))}
        {setAt && (
          <span className="arc-mark" style={{ left: `${pct(setAt)}%` }}>
            <Plate name="sun" size={24} under={null} />
          </span>
        )}
        {closedAt && (
          <span className="arc-mark" style={{ left: `${pct(closedAt)}%` }}>
            <Plate name="moth" size={24} under={null} />
          </span>
        )}
        <span className="arc-now" style={{ left: `${pct(at)}%` }} />
      </div>
      <p className="fig m-0 mt-1 px-2 flex items-baseline gap-3 flex-wrap">
        <span>{legend}</span>
        <span className="leader hidden sm:block" />
        <span className="not-italic font-sans text-[11.5px] text-ink-400 tabular-nums">
          the hand at {clock(at)}
        </span>
      </p>
    </section>
  );
}
