import type { HeatmapCell } from "@/lib/reflection/auto-detect";
import { formatDay, weekdayOf } from "@/lib/time/day";

/**
 * The year as a grid. Columns are weeks (oldest left, newest right),
 * rows are day-of-week (Mon top, Sun bottom), months labelled along the
 * top where they begin.
 *
 * The dead months before the first check-in are cropped: a record that
 * starts on 25 September prints from the week of 25 September, with a
 * line saying so, rather than nine months of empty cells on its left.
 *
 * Each cell is inked by check-in state, and each ink carries its own
 * hatch so the colour is never the only cue:
 *   - morning only     gold, single hatch
 *   - evening only     violet, cross-hatched
 *   - both             the two overprinted solid, the second pass a
 *                      pixel off register
 *   - neither          an empty ruled cell
 */
export function YearHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const firstIdx = cells.findIndex((c) => c.morning || c.evening);
  const hasAny = firstIdx >= 0;

  // Crop to the week containing the first observation. The row order is
  // Monday first, so the week starts on the Monday on or before it.
  let start = hasAny ? firstIdx : 0;
  if (hasAny) {
    const dow = (weekdayOf(cells[firstIdx].date) + 6) % 7; // 0 = Mon
    start = Math.max(0, firstIdx - dow);
  }
  const shown = cells.slice(start);
  const since = hasAny ? cells[firstIdx].date : null;

  // Group into week columns, padding the first column up to its Monday.
  const weeks: (HeatmapCell | null)[][] = [];
  let week: (HeatmapCell | null)[] = [];
  for (const [i, cell] of shown.entries()) {
    const dow = (weekdayOf(cell.date) + 6) % 7;
    if (i === 0) for (let k = 0; k < dow; k++) week.push(null);
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // A month label on the first column whose first real day starts a new
  // month, so the labels sit where the months begin.
  const labels: (string | null)[] = weeks.map((w, wi) => {
    const firstReal = w.find((c): c is HeatmapCell => c !== null);
    if (!firstReal) return null;
    const month = firstReal.date.slice(0, 7);
    if (wi === 0) return formatDay(firstReal.date, "MMM");
    const prev = weeks[wi - 1].find((c): c is HeatmapCell => c !== null);
    if (!prev) return null;
    return prev.date.slice(0, 7) === month
      ? null
      : formatDay(firstReal.date, "MMM");
  });

  function inkFor(cell: HeatmapCell | null): string {
    if (!cell) return "ycell ycell-off";
    if (cell.morning && cell.evening) return "ycell ycell-both";
    if (cell.morning) return "ycell ycell-am";
    if (cell.evening) return "ycell ycell-pm";
    return "ycell";
  }

  const counts = {
    both: cells.filter((c) => c.morning && c.evening).length,
    am: cells.filter((c) => c.morning && !c.evening).length,
    pm: cells.filter((c) => !c.morning && c.evening).length,
  };

  return (
    <div className="sheet overflow-x-auto">
      {!hasAny ? (
        <p className="text-[14.5px] text-ink-300 m-0">
          No check-ins in the last year yet. The first morning starts the
          grid.
        </p>
      ) : (
        <>
          <div className="inline-flex flex-col gap-1">
            {/* month labels across the top, one per week column */}
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
              }}
            >
              {labels.map((l, i) => (
                <span
                  key={i}
                  className="text-[10.5px] text-ink-400 whitespace-nowrap leading-none h-3"
                  style={{ fontVariationSettings: "'wght' 660" }}
                >
                  {l ?? ""}
                </span>
              ))}
            </div>
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateRows: "repeat(7, 11px)",
                gridAutoFlow: "column",
                gridAutoColumns: "11px",
              }}
            >
              {weeks.map((w, wi) =>
                w.map((cell, di) => (
                  <span
                    key={`${wi}-${di}`}
                    title={
                      cell
                        ? `${formatDay(cell.date, "EEE d MMM")}: ${
                            cell.morning && cell.evening
                              ? "full day"
                              : cell.morning
                                ? "morning"
                                : cell.evening
                                  ? "evening"
                                  : "nothing logged"
                          }`
                        : ""
                    }
                    className={inkFor(cell)}
                  />
                )),
              )}
            </div>
          </div>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-[11.5px] text-ink-300 mt-4">
            <Legend swatch="ycell ycell-am" label={`Morning only, ${counts.am}`} />
            <Legend swatch="ycell ycell-pm" label={`Evening only, ${counts.pm}`} />
            <Legend swatch="ycell ycell-both" label={`Both, ${counts.both}`} />
            <Legend swatch="ycell" label="Nothing" />
            {since && (
              <span className="ml-auto tabular-nums">
                since {formatDay(since, "d MMM")}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`${swatch} shrink-0`} />
      <span>{label}</span>
    </span>
  );
}
