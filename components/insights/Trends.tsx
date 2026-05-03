import { format } from "date-fns";
import type { InsightsData } from "@/lib/insights/queries";

/**
 * Three at-a-glance visualizations:
 * 1. Day rating timeline — vertical bars per day, height = evening rating
 * 2. Focus minutes per day — horizontal bars, length = minutes
 * 3. Habit completion heatmap — habits × days, dot if completed
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

function DayRatingChart({ data }: { data: InsightsData }) {
  const maxRating = 5;
  const colorFor = (r: number | null): string => {
    if (r === null) return "bg-ink-700/40";
    if (r >= 4) return "bg-accent-green/70";
    if (r >= 3) return "bg-accent-sky/60";
    if (r >= 2) return "bg-accent-gold/60";
    return "bg-accent-rose/60";
  };

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        Evening rating · last {data.windowDays} days
      </div>
      <div className="flex items-end gap-[3px] h-32">
        {data.dayPoints.map((p) => {
          const h =
            p.eveningRating !== null
              ? `${(p.eveningRating / maxRating) * 100}%`
              : "8%";
          return (
            <div
              key={p.date}
              title={`${format(new Date(p.date), "MMM d")} — ${
                p.eveningRating ?? "—"
              }/5`}
              className={`flex-1 rounded-sm ${colorFor(p.eveningRating)}`}
              style={{ height: h }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-ink-400 mt-2">
        <span>{format(new Date(data.dayPoints[0].date), "MMM d")}</span>
        <span>
          {format(
            new Date(data.dayPoints[data.dayPoints.length - 1].date),
            "MMM d",
          )}
        </span>
      </div>
    </div>
  );
}

function FocusChart({ data }: { data: InsightsData }) {
  const maxMinutes = Math.max(
    60,
    ...data.dayPoints.map((p) => p.focusMinutes),
  );
  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        Focus minutes · last {data.windowDays} days · max{" "}
        {Math.round(maxMinutes)}m
      </div>
      <div className="flex items-end gap-[3px] h-24">
        {data.dayPoints.map((p) => {
          const h = `${Math.max(2, (p.focusMinutes / maxMinutes) * 100)}%`;
          return (
            <div
              key={p.date}
              title={`${format(new Date(p.date), "MMM d")} — ${
                p.focusMinutes
              } min`}
              className={`flex-1 rounded-sm ${
                p.focusMinutes >= 30
                  ? "bg-accent-sky/70"
                  : p.focusMinutes > 0
                    ? "bg-accent-sky/30"
                    : "bg-ink-700/40"
              }`}
              style={{ height: h }}
            />
          );
        })}
      </div>
    </div>
  );
}

function HabitHeatmap({ data }: { data: InsightsData }) {
  return (
    <div className="card overflow-x-auto">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        Habit grid · last {data.windowDays} days
      </div>
      <div className="space-y-1.5 min-w-[400px]">
        {data.habits.map((h) => (
          <div key={h.id} className="flex items-center gap-3">
            <div className="w-32 text-xs text-ink-200 truncate shrink-0">
              {h.name}
            </div>
            <div className="flex-1 flex gap-[2px]">
              {data.days.map((d) => {
                const done = h.completions.has(d);
                return (
                  <div
                    key={d}
                    title={`${format(new Date(d), "MMM d")} — ${
                      done ? "done" : "—"
                    }`}
                    className={`flex-1 h-4 rounded-sm ${
                      done ? "bg-accent-green/70" : "bg-ink-700/40"
                    }`}
                  />
                );
              })}
            </div>
            <div className="w-10 text-right text-[11px] text-ink-400 tabular-nums shrink-0">
              {h.completions.size}/{data.windowDays}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
