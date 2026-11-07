import type { InsightsData } from "@/lib/insights/queries";
import { phraseSum, phraseTally } from "@/lib/insights/habit-denominator";
import { formatDay } from "@/lib/time/day";

/**
 * The stat row at the top of the looking-back page, for whatever window
 * is chosen. Six readings, each with the line under it that says what
 * the number is out of.
 *
 * The denominators are honest ones. Mornings and evenings are counted
 * against the days since the first check-in inside the window, so a
 * record that began three days ago reads 3 of 3 rather than 3 of 30.
 * Habits are counted by each habit's cadence from the day it existed
 * (see lib/insights/habit-denominator); a kept weekday week is 5 of 5
 * and a weekly habit reads "1 this week", and no percentage is offered.
 */
export function StatCards({ data }: { data: InsightsData }) {
  const ratings = data.dayPoints
    .map((p) => p.eveningRating)
    .filter((r): r is number => r !== null);
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : null;

  const activeDays = data.activeDays;
  const sinceLabel =
    data.activeSince && activeDays < data.windowDays
      ? `since ${formatDay(data.activeSince, "d MMM")}`
      : null;
  const dayWord = (n: number) => (n === 1 ? "day" : "days");

  const tallies = data.habits.map((h) => h.tally);
  const habitPhrase = phraseSum(tallies, data.windowDays);
  const mixed = new Set(tallies.map((t) => t.unit)).size > 1;

  const focusHours = data.totalFocusMinutes / 60;
  const focusValue =
    data.totalFocusMinutes >= 120
      ? focusHours.toFixed(focusHours >= 10 ? 0 : 1)
      : String(data.totalFocusMinutes);
  const focusUnit = data.totalFocusMinutes >= 120 ? "h" : "min";

  return (
    <div className="sheet grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-5">
      <Stat
        label="Mornings"
        value={String(data.morningCheckins)}
        unit={activeDays > 0 ? `/${activeDays}` : undefined}
        foot={
          activeDays === 0
            ? "none in this window"
            : sinceLabel
              ? `${dayWord(activeDays)} ${sinceLabel}`
              : `of ${activeDays} ${dayWord(activeDays)}`
        }
      />
      <Stat
        label="Evenings"
        value={String(data.eveningCheckins)}
        unit={activeDays > 0 ? `/${activeDays}` : undefined}
        foot={
          activeDays === 0
            ? "none in this window"
            : sinceLabel
              ? `${dayWord(activeDays)} ${sinceLabel}`
              : `of ${activeDays} ${dayWord(activeDays)}`
        }
      />
      <Stat
        label="Average day"
        value={avgRating ?? "none"}
        unit={avgRating ? "/5" : undefined}
        foot={`${ratings.length} ${ratings.length === 1 ? "shutdown" : "shutdowns"} rated`}
      />
      <Stat
        label="Habits kept"
        value={habitPhrase.value}
        unit={habitPhrase.unit}
        foot={habitPhrase.foot}
      />
      <Stat
        label="Focus"
        value={focusValue}
        unit={focusUnit}
        foot={`${data.totalFocusSessions} ${
          data.totalFocusSessions === 1 ? "block" : "blocks"
        }`}
      />
      <Stat
        label="Decisions"
        value={String(data.decisionCount)}
        foot="tagged in the journal"
      />

      {/* When the habits are counted in different units the headline is
          only part of the story, so each habit gets its own line. */}
      {mixed && data.habits.length > 0 && (
        <div className="col-span-full flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-300 pt-3 border-t border-ink-600">
          {data.habits.map((h) => (
            <span key={h.id} className="tabular-nums">
              <span
                className="text-ink-100"
                style={{ fontVariationSettings: "'wght' 650" }}
              >
                {h.name}
              </span>{" "}
              {phraseTally(h.tally, data.windowDays)}
            </span>
          ))}
        </div>
      )}
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
