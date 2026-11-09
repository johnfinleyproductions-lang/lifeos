"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type ActiveSession = {
  id: string;
  label: string;
  startedAt: string;
};

type CompletedSession = {
  id: string;
  label: string;
  durationMinutes: number;
  startedAt: string;
};

export function FocusClient({
  active,
  today,
  totalMinutes,
  initialLabel = "",
}: {
  active: ActiveSession | null;
  today: CompletedSession[];
  totalMinutes: number;
  /** a priority handed over from Today, so the block starts named */
  initialLabel?: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Live tick — only when there's an active session.
  useEffect(() => {
    if (!active) return;
    const startMs = new Date(active.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function startSession() {
    if (label.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/focus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start");
      }
      setLabel("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setSubmitting(false);
    }
  }

  async function stopSession() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/focus/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to stop");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setSubmitting(false);
    }
  }

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {active ? (
        /* Live, so it takes the spot ink and the misregistration. */
        <section>
          <div className="tab-row">
            <span className="tab tab-spot">In focus</span>
            <span className="fill" />
          </div>
          <div className="sheet sheet-hi sheet-cut shadow-mis text-center py-9">
            <div
              className="t-num text-[clamp(56px,9vw,96px)] leading-none tracking-[-0.03em]"
              style={{ fontVariationSettings: "'wdth' 84, 'wght' 800" }}
              aria-live="off"
            >
              {timeStr}
            </div>
            <div
              className="text-[15px] text-ink-300 mt-3 mb-7"
              style={{ fontVariationSettings: "'wght' 600" }}
            >
              {active.label}
            </div>
            <button
              type="button"
              onClick={stopSession}
              disabled={submitting}
              className="btn btn-spot btn-lg"
            >
              {submitting ? "Stopping" : "Stop the block"}
            </button>
          </div>
        </section>
      ) : (
        <section>
          <div className="tab-row">
            <span className="tab">Start a focus block</span>
            <span className="fill" />
          </div>
          <div className="sheet sheet-hi">
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="What are you working on?"
                maxLength={120}
                autoFocus
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    label.trim().length > 0 &&
                    !submitting
                  )
                    startSession();
                }}
                className="inp"
              />
              <button
                type="button"
                onClick={startSession}
                disabled={submitting || label.trim().length === 0}
                className="btn shrink-0"
              >
                {submitting ? "Starting" : "Start"}
              </button>
            </div>
            {error && (
              <div className="alert mt-3" role="alert">
                {error}
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="tab-row">
          <span className="tab">Today</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400 tabular-nums">
            {today.length} {today.length === 1 ? "block" : "blocks"}
          </span>
        </div>
        <div className="sheet">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <span className="stat-l">Logged</span>
            <span className="stat-v mt-0">
              {totalMinutes}
              <small>min</small>
            </span>
          </div>
          {today.length === 0 ? (
            <p className="text-[14px] text-ink-400 m-0 pt-3 border-t-[1.5px] border-ink-50">
              No completed blocks yet today.
            </p>
          ) : (
            <div className="border-t-[1.5px] border-ink-50">
              {today.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-ink-600 last:border-b-0"
                >
                  <span
                    className="truncate flex-1 text-[15px]"
                    style={{ fontVariationSettings: "'wght' 560" }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[12.5px] text-ink-400 tabular-nums shrink-0">
                    {format(new Date(s.startedAt), "h:mm a")}
                  </span>
                  <span className="t-num text-[14px] w-14 text-right shrink-0">
                    {s.durationMinutes}
                    <span className="text-ink-400 text-[11.5px]"> min</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && active && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
