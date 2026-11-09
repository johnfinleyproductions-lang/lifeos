import type { StripDay } from "@/lib/experiments/load";

const WORDS: Record<StripDay["state"], string> = {
  done: "done",
  missed: "not done",
  today: "today",
  open: "no mark",
  ahead: "to come",
  off: "not a day for it",
};

/**
 * One square per day of the experiment. Ink is a day it happened, a dash is
 * a day it did not, orange is today. No colour for good and bad: a day it
 * did not happen is part of the record, not a fault in it.
 */
export function Strip({ days, compact = false }: { days: StripDay[]; compact?: boolean }) {
  const columns = Math.min(days.length, 14);
  const done = days.filter((d) => d.state === "done").length;
  return (
    <div
      className="grid gap-[5px]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${days.length} days, ${done} done so far.`}
    >
      {days.map((d) => (
        <div
          key={d.day}
          title={`${d.label}: ${WORDS[d.state]}`}
          className={`grid place-items-center ${compact ? "h-[22px]" : "h-[34px]"} ${
            d.state === "done"
              ? "bg-ink-50 border-[1.5px] border-ink-50 text-knock"
              : d.state === "today"
                ? "bg-accent-spot border-[1.5px] border-ink-50"
                : d.state === "missed"
                  ? "bg-ink-700 border-[1.5px] border-ink-50 text-ink-50"
                  : d.state === "open"
                    ? "border-[1.5px] border-dashed border-ink-50"
                    : d.state === "ahead"
                      ? "border-[1.5px] border-dashed border-ink-400"
                      : "bg-ink-600"
          }`}
        >
          {d.state === "done" && !compact && (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
              <path d="M3 8.5l3.2 3L13 4.5" />
            </svg>
          )}
          {d.state === "missed" && (
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
              <path d="M4 8h8" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
