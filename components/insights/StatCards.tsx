import type { InsightsData } from "@/lib/insights/queries";

export function StatCards({ data }: { data: InsightsData }) {
  const ratings = data.dayPoints
    .map((p) => p.eveningRating)
    .filter((r): r is number => r !== null);
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : "—";

  const focusHours = (data.totalFocusMinutes / 60).toFixed(1);

  const habitTotal = data.habits.length * data.windowDays;
  const habitDone = data.habits.reduce((s, h) => s + h.completions.size, 0);
  const habitPct =
    habitTotal > 0 ? Math.round((habitDone / habitTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat
        label="Avg day rating"
        value={avgRating}
        unit="/ 5"
        accent="text-accent-rose"
      />
      <Stat
        label="Focus hours"
        value={focusHours}
        accent="text-accent-sky"
      />
      <Stat
        label="Habits hit"
        value={`${habitPct}`}
        unit="%"
        accent="text-accent-green"
      />
      <Stat
        label="Decisions"
        value={String(data.decisionCount)}
        accent="text-accent-gold"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: string;
}) {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className={`text-[10px] uppercase tracking-wider mb-1 ${accent}`}>
        {label}
      </div>
      <div className="font-serif text-3xl text-ink-50 tabular-nums">
        {value}
        {unit && <span className="text-sm text-ink-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
