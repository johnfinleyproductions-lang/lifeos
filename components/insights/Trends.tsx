import { formatDay } from "@/lib/time/day";
import type { InsightsData } from "@/lib/insights/queries";

/**
 * Three plotted sheets:
 * 1. Day rating, one bar per day, height is the evening rating
 * 2. Focus minutes per day, height is minutes against the window's max
 * 3. Habit grid, habits by days, a filled cell per completion
 *
 * Every mark is an engraved one: an outline in the series ink with a
 * hatched pass inside it. The rating chart cross-hatches, the heavier
 * reading; focus hatches once, and a day under half an hour gets only
 * the stipple. Days with nothing logged print as a faint stub so the
 * axis still reads as thirty days.
 */
export function Trends({ data }: { data: InsightsData }) {
  return (
    <div className="space-y-6">
      <DayRatingChart data={data} />
      <FocusChart data={data} />
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
                className="w-32 text-[12.5px] truncate shrink-0"
                style={{ fontVariationSettings: "'wght' 620" }}
              >
                {h.name}
              </div>
              <div className="flex-1 flex gap-[2px]">
                {data.days.map((d) => {
                  const done = h.completions.has(d);
                  return (
                    <div
                      key={d}
                      title={`${formatDay(d, "MMM d")}: ${
                        done ? "done" : "missed"
                      }`}
                      className={`flex-1 h-4 ${
                        done
                          ? "hx hx-fine text-ink-50"
                          : "border border-ink-600"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="w-12 text-right text-[11.5px] text-ink-400 tabular-nums shrink-0">
                {h.completions.size}/{data.windowDays}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
