import type { InsightsData } from "@/lib/insights/queries";

export function StatCards({ data }: { data: InsightsData }) {
  const ratings = data.dayPoints
    .map((p) => p.eveningRating)
    .filter((r): r is number => r !== null);
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : null;

  const focusHours = (data.totalFocusMinutes / 60).toFixed(1);

  const habitTotal = data.habits.length * data.windowDays;
  const habitDone = data.habits.reduce((s, h) => s + h.completions.size, 0);
  const habitPct =
    habitTotal > 0 ? Math.round((habitDone / habitTotal) * 100) : 0;

  return (
    <div className="sheet grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
      <Stat
        label="Average day"
        value={avgRating ?? "none"}
        unit={avgRating ? "/5" : undefined}
        foot={`${ratings.length} ${ratings.length === 1 ? "shutdown" : "shutdowns"} rated`}
      />
      <Stat
        label="Focus logged"
        value={focusHours}
        unit="h"
        foot={`${data.totalFocusMinutes} minutes`}
      />
      <Stat
        label="Habits struck"
        value={String(habitPct)}
        unit="%"
        foot={`${habitDone} of ${habitTotal} possible`}
      />
      <Stat
        label="Decisions"
        value={String(data.decisionCount)}
        foot="tagged in the journal"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  foot,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
}) {
  return (
    <div>
      <div className="stat-l">{label}</div>
      <div className="stat-v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="stat-f">{foot}</div>
    </div>
  );
}
