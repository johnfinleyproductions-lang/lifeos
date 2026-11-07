import { formatDay } from "@/lib/time/day";
import type { InsightsData } from "@/lib/insights/queries";
import { phraseTally } from "@/lib/insights/habit-denominator";

/**
 * The plotted sheets for a 7- or 30-day window:
 * 1. Day rating, one bar per day, height is the evening rating
 * 2. Focus minutes per day, height is minutes against the window's max
 * 3. Habit grid, habits by days, a filled cell per completion
 *
 * A chart with nothing to plot is not printed. The old page drew two
 * empty axes under the words "not enough data yet"; an axis with no
 * marks on it says nothing a sentence does not say better.
 *
 * Every mark is an engraved one: an outline in the series ink with a
 * hatched pass inside it. The rating chart cross-hatches, the heavier
 * reading; focus hatches once, and a day under half an hour gets only
 * the stipple. Days with nothing logged print as a faint stub so the
 * axis still reads as the whole window.
 */
export function Trends({ data }: { data: InsightsData }) {
  const anyRating = data.dayPoints.some((p) => p.eveningRating !== null);
  const anyFocus = data.dayPoints.some((p) => p.focusMinutes > 0);
  if (!anyRating && !anyFocus && data.habits.length === 0) return null;

  return (
    <div className="space-y-6">
      {anyRating && <DayRatingChart data={data} />}
      {anyFocus && <FocusChart data={data} />}
      {data.habits.length > 0 && <HabitHeatmap data={data} />}
    </div>
  );
}

function Axis({ data }: { data: InsightsData }) {
  return (
    <div className="flex justify-between text-[10.5px] text-ink-400 mt-2 tabular-nums">
      <span>{formatDay(data.dayPoints[0].date, "MMM d")}</span>
      <span>
        {formatDay(data.dayPoints[data.dayPoints.length - 1].date, "MMM d")}
      </span>
    </div>
  );
}

function DayRatingChart({ data }: { data: InsightsData }) {
  const maxRating = 5;
  const inkFor = (r: number | null): string => {
    if (r === null) return "bg-ink-600";
    if (r >= 4) return "hx-x text-accent-green";
    if (r >= 3) return "hx-x text-accent-sky";
    if (r >= 2) return "hx text-accent-gold";
    return "hx-dot text-accent-rose";
  };

  return (
    <section>
      <div className="tab-row">
        <span className="tab">Evening rating</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400">
          last {data.windowDays} days
        </span>
      </div>
      <div className="sheet">
        <div className="flex items-end gap-[2px] sm:gap-[3px] h-32 border-b-[1.5px] border-ink-50">
          {data.dayPoints.map((p) => {
            const h =
              p.eveningRating !== null
                ? `${(p.eveningRating / maxRating) * 100}%`
                : "6%";
            return (
              <div
                key={p.date}
                title={`${formatDay(p.date, "MMM d")}: ${
                  p.eveningRating === null
                    ? "not rated"
                    : `${p.eveningRating}/5`
                }`}
                className={`flex-1 ${inkFor(p.eveningRating)}`}
                style={{ height: h }}
              />
            );
          })}
        </div>
        <Axis data={data} />
      </div>
    </section>
  );
}

function FocusChart({ data }: { data: InsightsData }) {
  const maxMinutes = Math.max(60, ...data.dayPoints.map((p) => p.focusMinutes));
  return (
    <section>
      <div className="tab-row">
        <span className="tab">Focus minutes</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          last {data.windowDays} days, longest {Math.round(maxMinutes)} min
        </span>
      </div>
      <div className="sheet">
        <div className="flex items-end gap-[2px] sm:gap-[3px] h-24 border-b-[1.5px] border-ink-50">
          {data.dayPoints.map((p) => {
            const h = `${Math.max(3, (p.focusMinutes / maxMinutes) * 100)}%`;
            return (
              <div
                key={p.date}
                title={`${formatDay(p.date, "MMM d")}: ${
                  p.focusMinutes
                } min`}
                className={`flex-1 ${
                  p.focusMinutes >= 30
                    ? "hx text-accent-sky"
                    : p.focusMinutes > 0
                      ? "hx-dot text-accent-sky"
                      : "bg-ink-600"
                }`}
                style={{ height: h }}
              />
            );
          })}
        </div>
        <Axis data={data} />
      </div>
    </section>
  );
}

/**
 * Habits by days. A cell is only ruled on a day the habit was due: a
 * weekdays habit has no cell on a Saturday, a weekly habit's cells are
 * faint on days it was not pressed, and no cell is drawn before the
 * habit existed. The old grid ruled every day for every habit and
 * called each empty one "missed".
 */
function HabitHeatmap({ data }: { data: InsightsData }) {
  return (
    <section>
      <div className="tab-row">
        <span className="tab">Habit grid</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400">
          last {data.windowDays} days
        </span>
      </div>
      <div className="sheet overflow-x-auto">
        <div className="space-y-1.5 min-w-[400px]">
          {data.habits.map((h) => (
            <div key={h.id} className="flex items-center gap-3">
              <div
                className="w-32 shrink-0"
                style={{ fontVariationSettings: "'wght' 620" }}
              >
                <div className="text-[12.5px] truncate">{h.name}</div>
                <div className="text-[10.5px] text-ink-400 leading-none">
                  {h.cadence}
                </div>
              </div>
              <div className="flex-1 flex gap-[2px]">
                {h.tally.cells.map((c) => {
                  const cls = !c.existed
                    ? "opacity-0"
                    : c.done
                      ? "hx hx-fine text-ink-50"
                      : c.due && h.tally.unit === "days"
                        ? "border border-ink-600"
                        : "border border-ink-600 opacity-40";
                  const title = !c.existed
                    ? `${formatDay(c.date, "MMM d")}: before this habit`
                    : c.done
                      ? `${formatDay(c.date, "MMM d")}: pressed`
                      : c.due && h.tally.unit === "days"
                        ? `${formatDay(c.date, "MMM d")}: due, not pressed`
                        : `${formatDay(c.date, "MMM d")}: not due`;
                  return (
                    <div
                      key={c.date}
                      title={title}
                      className={`flex-1 h-4 ${cls}`}
                    />
                  );
                })}
              </div>
              <div className="w-24 text-right text-[11.5px] text-ink-400 tabular-nums shrink-0">
                {phraseTally(h.tally, data.windowDays)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
