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
}: {
  active: ActiveSession | null;
  today: CompletedSession[];
  totalMinutes: number;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Live tick — only when there's an active session.
  useEffect(() => {
    if (!active) return;
    const startMs = new Date(active.startedAt).getTime();
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
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
    <div className="space-y-4">
      {active ? (
        <div className="card text-center py-10">
          <div className="card-glow" />
          <div className="text-xs uppercase tracking-[0.18em] text-accent-sky mb-3">
            In focus
          </div>
          <div className="font-serif text-7xl text-ink-50 tabular-nums mb-3">
            {timeStr}
          </div>
          <div className="text-sm text-ink-300 mb-6">{active.label}</div>
          <button
            type="button"
            onClick={stopSession}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-accent-rose/15 text-accent-rose border border-accent-rose/30 text-sm hover:bg-accent-rose/25 disabled:opacity-30 transition"
          >
            {submitting ? "Stopping…" : "Stop session"}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-glow" />
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
            Start a focus block
          </div>
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
            className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-sky focus:outline-none mb-4"
          />
          {error && (
            <div className="text-xs text-accent-rose mb-3">{error}</div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={startSession}
              disabled={submitting || label.trim().length === 0}
              className="px-5 py-2 rounded-lg bg-accent-sky/15 text-accent-sky border border-accent-sky/30 text-sm hover:bg-accent-sky/25 disabled:opacity-30 transition"
            >
              {submitting ? "Starting…" : "Start →"}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-glow" />
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400">
            Today
          </div>
          <div className="font-serif text-lg text-ink-100 tabular-nums">
            {totalMinutes}{" "}
            <span className="text-sm text-ink-400">min</span>
          </div>
        </div>
        {today.length === 0 ? (
          <div className="text-sm text-ink-400 italic">
            No completed sessions yet today.
          </div>
        ) : (
          <div className="space-y-2">
            {today.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm gap-3"
              >
                <span className="text-ink-100 truncate flex-1">{s.label}</span>
                <span className="text-ink-400 tabular-nums shrink-0">
                  {format(new Date(s.startedAt), "h:mm a")} ·{" "}
                  {s.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && active && (
        <div className="text-xs text-accent-rose">{error}</div>
      )}
    </div>
  );
}
