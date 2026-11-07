import type { HeatmapCell } from "@/lib/reflection/auto-detect";
import { weekdayOf } from "@/lib/time/day";

/**
 * 365-day grid. Columns are weeks (oldest left, newest right), rows are
 * day-of-week (Sun top, Sat bottom).
 *
 * Each cell is inked by check-in state:
 *   - morning only             the gold ink
 *   - evening only             the violet ink
 *   - both morning + evening   the two overprinted, which on a riso
 *                              makes a third colour nobody mixed, with
 *                              the second pass landing a hair off
 *   - neither                  an empty cell
 */
export function YearHeatmap({ cells }: { cells: HeatmapCell[] }) {
  // Group into weeks. Each cell knows its weekday (0=Sun..6=Sat).
  // We pad the start so the first week is a complete column.
  const weeks: (HeatmapCell | null)[][] = [];
  let currentWeek: (HeatmapCell | null)[] = [];
  let firstDayWeekday = -1;

  for (const cell of cells) {
    const dow = weekdayOf(cell.date);
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

  function inkFor(cell: HeatmapCell | null): string {
    if (!cell) return "bg-transparent";
    if (cell.morning && cell.evening) return "overprint";
    if (cell.morning) return "bg-accent-gold";
    if (cell.evening) return "bg-accent-violet";
    return "bg-ink-600";
  }

  return (
    <div className="sheet overflow-x-auto">
      <div
        className="inline-grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {weeks.map((week, wi) =>
          week.map((cell, di) => (
            <div
              key={`${wi}-${di}`}
              title={cell ? cell.date : ""}
              className={`w-2.5 h-2.5 ${inkFor(cell)}`}
            />
          )),
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-ink-400 mt-4">
        <Legend swatch="bg-accent-gold" label="Morning" />
        <Legend swatch="bg-accent-violet" label="Evening" />
        <Legend swatch="overprint" label="Both" />
        <Legend swatch="bg-ink-600" label="Neither" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 ${swatch}`} />
      <span>{label}</span>
    </div>
  );
}
