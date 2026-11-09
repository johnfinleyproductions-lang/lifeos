"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExperimentView } from "@/lib/experiments/load";
import { timesPerWeek, type Reason } from "@/lib/experiments/rules";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { Strip } from "./Strip";

const REASON_LABEL: Record<Reason, string> = {
  head: "Not sure it is worth doing",
  heart: "Did not feel like it",
  hand: "Something practical got in the way",
};

/**
 * An experiment in play: the sentence, the days, and today's mark.
 *
 * `compact` is the version that sits on Today and above the evening page:
 * the same mark, without the notes and the ending.
 *
 * Nothing here scores the run. There is no percentage and no streak; the
 * strip shows what happened and the judging waits for the last day.
 */
export function RunningCard({
  exp,
  compact = false,
  onEnd,
}: {
  exp: ExperimentView;
  compact?: boolean;
  onEnd?: () => void;
}) {
  const router = useRouter();
  const loose = timesPerWeek(exp.cadence) !== null;
  const [marked, setMarked] = useState(exp.today?.marked ?? false);
  const [done, setDone] = useState(exp.today?.done ?? false);
  const [note, setNote] = useState(exp.today?.note ?? "");
  const [reason, setReason] = useState<string | null>(exp.today?.reason ?? null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yesterdayGone, setYesterdayGone] = useState(false);

  async function mark(body: { done: boolean; note?: string; reason?: string | null; day?: string }) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/experiments/${exp.id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That did not save.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function choose(next: boolean) {
    const ok = await mark({ done: next, note: note.trim() || undefined, reason: next ? null : reason });
    if (ok) {
      setMarked(true);
      setDone(next);
      if (next) setReason(null);
    }
  }

  async function saveLine(nextReason: string | null = reason) {
    const ok = await mark({ done, note: note.trim() || undefined, reason: done ? null : nextReason });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const ready = exp.phase === "ready";

  return (
    <div className={`sheet ${compact ? "" : "sheet-cut"}`} data-experiment={exp.id}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="lbl">
          {compact
            ? "Experiment"
            : `${ready ? "Finished" : "Running now"}${exp.round > 1 ? `, round ${exp.round}` : ""}`}
        </div>
        <span className={ready ? "tab" : "tab tab-spot"}>
          {ready ? "Ready to close" : `Day ${exp.dayNumber} of ${exp.lengthDays}`}
        </span>
      </div>

      <p className={`font-serif m-0 ${compact ? "text-[18px] leading-[1.35]" : "text-[23px] leading-[1.3]"}`}>
        {exp.sentence}
      </p>
      {!compact && exp.curiosity && (
        <p className="mt-2 mb-0 text-[13.5px] text-ink-300">
          Because I am curious whether{" "}
          <span className="font-serif italic text-[16px] text-ink-100">{exp.curiosity}</span>
        </p>
      )}

      <div className="mt-4">
        <Strip days={exp.strip} compact={compact} />
      </div>

      {ready ? (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 text-[13.5px] text-ink-300">
            It ran its course on {exp.endsOn}. {exp.tally}
          </p>
          {compact && (
            <Link href="/experiments" className="btn btn-sm">
              Close it
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Today">
            <button
              type="button"
              className={`btn btn-sm ${marked && done ? "" : "btn-ghost"}`}
              aria-pressed={marked && done}
              disabled={busy}
              onClick={() => choose(true)}
            >
              {loose ? "Did it today" : "Done today"}
            </button>
            {!loose && (
              <button
                type="button"
                className={`btn btn-sm ${marked && !done ? "" : "btn-ghost"}`}
                aria-pressed={marked && !done}
                disabled={busy}
                onClick={() => choose(false)}
              >
                Not today
              </button>
            )}
          </div>

          {marked && !done && !loose && (
            <div className="mt-3">
              <div className="lbl mb-1.5">What got in the way? It is useful to know which.</div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="What got in the way">
                {(Object.keys(REASON_LABEL) as Reason[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="chip min-h-9"
                    aria-pressed={reason === r}
                    disabled={busy}
                    onClick={() => {
                      const next = reason === r ? null : r;
                      setReason(next);
                      void saveLine(next);
                    }}
                  >
                    {REASON_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {marked && (
            <div className="mt-3">
              <label className="lbl block mb-1.5" htmlFor={`note-${exp.id}`}>
                One line on how it went
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`note-${exp.id}`}
                  className="inp"
                  value={note}
                  maxLength={400}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveLine();
                  }}
                  placeholder="What did you notice?"
                />
                <VoiceButton
                  size="sm"
                  onTranscript={(t) => setNote((n) => (n ? `${n} ${t}` : t))}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-ghost shrink-0"
                  disabled={busy || note.trim() === (exp.today?.note ?? "").trim()}
                  onClick={() => saveLine()}
                >
                  Save
                </button>
              </div>
              {saved && (
                <div className="lbl mt-1.5" role="status">
                  Noted.
                </div>
              )}
            </div>
          )}

          {exp.yesterdayOpen && !yesterdayGone && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-[13.5px] text-ink-300">
              <span>Yesterday has no mark.</span>
              <button
                type="button"
                className="btn btn-sm btn-ghost min-h-9"
                disabled={busy}
                onClick={async () => {
                  if (await mark({ done: true, day: exp.yesterdayOpen! })) setYesterdayGone(true);
                }}
              >
                It happened
              </button>
              {!loose && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost min-h-9"
                  disabled={busy}
                  onClick={async () => {
                    if (await mark({ done: false, day: exp.yesterdayOpen! })) setYesterdayGone(true);
                  }}
                >
                  It did not
                </button>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-3 text-[13.5px] text-accent-rose" role="alert">
          {error}
        </div>
      )}

      {!compact && exp.notes.length > 0 && (
        <div className="mt-5 pt-4 border-t-[1.5px] border-ink-50">
          <div className="t-h2 mb-1">Field notes</div>
          <ul className="m-0 p-0 list-none">
            {exp.notes.map((n) => (
              <li
                key={n.day}
                className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 py-2.5 border-t border-ink-500 first:border-t-0"
              >
                <div>
                  <div className="text-[13px]" style={{ fontVariationSettings: "'wght' 720" }}>
                    Day {n.n}
                  </div>
                  <div className="lbl">{n.done ? "done" : "not done"}</div>
                </div>
                <p className="font-serif text-[17px] leading-[1.45] m-0">{n.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && !ready && onEnd && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="lbl">Ends {exp.endsOn}. The verdict waits until then.</span>
          <button type="button" className="lbl underline" onClick={onEnd}>
            End it early
          </button>
        </div>
      )}
      {compact && !ready && (
        <div className="mt-3">
          <Link href="/experiments" className="lbl underline">
            Open experiments
          </Link>
        </div>
      )}
    </div>
  );
}
