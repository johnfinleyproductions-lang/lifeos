"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DayState = {
  date: string;
  label: string;
  done: boolean;
};

type Habit = {
  id: string;
  name: string;
  cadence: string;
  description: string | null;
  last7Days: DayState[];
};

/**
 * Renders habits from props directly — no useState mirror.
 *
 * Earlier version stored `habits` in useState, which only initialized once
 * and didn't pick up new props after router.refresh(). Lesson: never wrap
 * server data in useState in a client component; just read props.
 *
 * Local state here is purely UI: form visibility, in-flight requests,
 * inline error.
 */
export function HabitsClient({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "weekly">(
    "daily",
  );
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createHabit() {
    if (name.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cadence }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create habit");
      }
      setName("");
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create habit");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleToday(habitId: string) {
    setToggling(habitId);
    setError(null);
    try {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-3">
      {habits.length === 0 && !showForm && (
        <div className="card text-center py-12">
          <div className="font-serif text-xl text-ink-100 mb-2">
            No habits yet.
          </div>
          <p className="text-sm text-ink-300 mb-4 max-w-sm mx-auto">
            Habits compound. Start with one. The smallest version of it,
            consistently, beats the perfect version, occasionally.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 transition"
          >
            + Start a habit
          </button>
        </div>
      )}

      {habits.map((h) => {
        const todayDone = h.last7Days[h.last7Days.length - 1].done;
        const streakCount = h.last7Days.filter((d) => d.done).length;
        return (
          <div key={h.id} className="card">
            <div className="card-glow" />
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="font-serif text-lg text-ink-100 truncate">
                  {h.name}
                </div>
                <div className="text-[11px] text-ink-400 uppercase tracking-wider mt-0.5">
                  {h.cadence} · {streakCount} of last 7
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleToday(h.id)}
                disabled={toggling === h.id}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm transition border ${
                  todayDone
                    ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                    : "border-white/10 text-ink-200 hover:border-white/30"
                } disabled:opacity-50`}
              >
                {toggling === h.id
                  ? "…"
                  : todayDone
                    ? "✓ Done today"
                    : "Mark done"}
              </button>
            </div>
            <div className="flex gap-1.5">
              {h.last7Days.map((d, i) => {
                const isToday = i === h.last7Days.length - 1;
                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className={`w-full h-9 rounded-md transition ${
                        d.done
                          ? "bg-accent-green/40"
                          : isToday
                            ? "bg-ink-700 border border-accent-green/30"
                            : "bg-ink-700"
                      }`}
                    />
                    <div
                      className={`text-[10px] ${
                        isToday ? "text-accent-green" : "text-ink-400"
                      }`}
                    >
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showForm ? (
        <div className="card">
          <div className="card-glow" />
          <div className="font-serif text-base text-ink-100 mb-4">
            New habit
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read 20 pages"
            maxLength={80}
            autoFocus
            className="w-full bg-ink-900 border border-white/5 rounded-lg px-3 py-2.5 text-sm focus:border-accent-green focus:outline-none mb-4"
          />
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
            Cadence
          </div>
          <div className="flex gap-2 mb-5">
            {(["daily", "weekdays", "weekly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  cadence === c
                    ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                    : "border-white/10 text-ink-300 hover:border-white/30"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {error && (
            <div className="text-xs text-accent-rose mb-3">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setError(null);
              }}
              className="text-sm text-ink-300 hover:text-ink-100 transition px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createHabit}
              disabled={submitting || name.trim().length === 0}
              className="px-4 py-1.5 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 disabled:opacity-30 transition"
            >
              {submitting ? "Saving…" : "Add habit"}
            </button>
          </div>
        </div>
      ) : (
        habits.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full py-3 text-sm text-ink-300 hover:text-ink-100 transition border border-dashed border-white/10 rounded-xl hover:border-white/30"
          >
            + Add habit
          </button>
        )
      )}

      {error && !showForm && (
        <div className="text-xs text-accent-rose">{error}</div>
      )}
    </div>
  );
}
