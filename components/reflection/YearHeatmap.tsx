import type { HeatmapCell } from "@/lib/reflection/auto-detect";

/**
 * 365-day grid. Columns are weeks (oldest left, newest right), rows are
 * day-of-week (Sun top, Sat bottom).
 *
 * Each cell colored by check-in state:
 *   - both morning + evening   bright green
 *   - morning only             muted green
 *   - evening only             muted violet
 *   - neither                  empty grid square
 */
export function YearHeatmap({ cells }: { cells: HeatmapCell[] }) {
  // Group into weeks. Each cell knows its weekday (0=Sun..6=Sat).
  // We pad the start so the first week is a complete column.
  const weeks: (HeatmapCell | null)[][] = [];
  let currentWeek: (HeatmapCell | null)[] = [];
  let firstDayWeekday = -1;

  for (const cell of cells) {
    const dow = new Date(cell.date + "T00:00:00").getDay();
    if (firstDayWeekday < 0) {
      firstDayWeekday = dow;
      // Pad earlier days of the same week with nulls
      for (let i = 0; i < dow; i++) currentWeek.push(null);
    }
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  // Trailing partial week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  function colorFor(cell: HeatmapCell | null): string {
    if (!cell) return "bg-transparent";
    if (cell.morning && cell.evening) return "bg-accent-green/70";
    if (cell.morning) return "bg-accent-green/30";
    if (cell.evening) return "bg-accent-violet/30";
    return "bg-ink-700/60";
  }

  return (
    <div className="card overflow-x-auto">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        365-day check-in
      </div>
      <div
        className="inline-grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {weeks.map((week, wi) =>
          week.map((cell, di) => (
            <div
              key={`${wi}-${di}`}
              title={cell ? cell.date : ""}
              className={`w-2.5 h-2.5 rounded-sm ${colorFor(cell)}`}
            />
          )),
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-ink-400 mt-4">
        <Legend swatch="bg-accent-green/70" label="Both" />
        <Legend swatch="bg-accent-green/30" label="Morning" />
        <Legend swatch="bg-accent-violet/30" label="Evening" />
        <Legend swatch="bg-ink-700/60" label="None" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${swatch}`} />
      <span>{label}</span>
    </div>
  );
}
