"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Watermark } from "@/components/field/Watermark";

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
    <div className="space-y-3.5">
      {habits.length === 0 && !showForm && (
        <div className="sheet sheet-bare sheet-cut text-center py-10 relative">
          <Watermark name="sprout" />
          <div className="t-h2 mb-2">No habits yet.</div>
          <p className="text-[14.5px] text-ink-300 mb-5 max-w-[40ch] mx-auto">
            Habits compound. Start with one. The smallest version of it,
            consistently, beats the perfect version, occasionally.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn"
          >
            Start a habit
          </button>
        </div>
      )}

      {habits.map((h) => {
        const todayDone = h.last7Days[h.last7Days.length - 1].done;
        const streakCount = h.last7Days.filter((d) => d.done).length;
        return (
          <div key={h.id} className="sheet">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div
                  className="text-[17px] leading-[1.2] truncate"
                  style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
                >
                  {h.name}
                </div>
                <div className="lbl mt-1">
                  {h.cadence}, {streakCount} of the last 7
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleToday(h.id)}
                disabled={toggling === h.id}
                aria-pressed={todayDone}
                className={`btn btn-sm shrink-0 ${
                  todayDone ? "btn-spot" : "btn-ghost"
                }`}
              >
                {toggling === h.id
                  ? "Saving"
                  : todayDone
                    ? "Done today"
                    : "Mark done"}
              </button>
            </div>

            {/* Seven cells, oldest first, cross-hatched when struck. Today takes the spot ink. */}
            <div className="flex gap-1.5">
              {h.last7Days.map((d, i) => {
                const isToday = i === h.last7Days.length - 1;
                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-1.5 flex-1"
                    title={`${d.date}${d.done ? ", done" : ""}`}
                  >
                    <div
                      className={`w-full h-8 ${
                        d.done
                          ? isToday
                            ? "hx-x text-accent-spot"
                            : "hx-x text-ink-50"
                          : isToday
                            ? "border-[1.5px] bg-ink-700 border-accent-spot"
                            : "border-[1.5px] bg-ink-700 border-ink-500"
                      }`}
                    />
                    <div
                      className={`text-[10.5px] ${
                        isToday ? "text-accent-spot" : "text-ink-400"
                      }`}
                      style={{ fontVariationSettings: "'wght' 640" }}
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
        <div className="sheet sheet-hi">
          <div className="tab-row">
            <span className="tab">New habit</span>
            <span className="fill" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="read twenty pages"
            maxLength={80}
            autoFocus
            className="inp mb-4"
          />
          <div className="lbl mb-2">Cadence</div>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {(["daily", "weekdays", "weekly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                aria-pressed={cadence === c}
                className="chip"
              >
                {c}
              </button>
            ))}
          </div>
          {error && (
            <div className="alert mb-3" role="alert">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setError(null);
              }}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createHabit}
              disabled={submitting || name.trim().length === 0}
              className="btn btn-sm"
            >
              {submitting ? "Saving" : "Add habit"}
            </button>
          </div>
        </div>
      ) : (
        habits.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="sheet sheet-bare border-dashed w-full py-3 text-[14px] text-ink-300 hover:text-ink-50 hover:border-ink-50"
            style={{ fontVariationSettings: "'wght' 640" }}
          >
            Add a habit
          </button>
        )
      )}

      {error && !showForm && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
