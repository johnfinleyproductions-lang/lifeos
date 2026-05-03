"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type IdealWeek,
  DAYS,
  DAY_LABELS,
} from "@/lib/compass/schema";

export function WeekEditor({ initial }: { initial: IdealWeek }) {
  const router = useRouter();
  const [week, setWeek] = useState<IdealWeek>({
    monday: initial.monday ?? "",
    tuesday: initial.tuesday ?? "",
    wednesday: initial.wednesday ?? "",
    thursday: initial.thursday ?? "",
    friday: initial.friday ?? "",
    saturday: initial.saturday ?? "",
    sunday: initial.sunday ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const idealWeek: IdealWeek = {};
      for (const day of DAYS) {
        const v = week[day]?.trim();
        if (v) idealWeek[day] = v;
      }
      const res = await fetch("/api/compass", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idealWeek }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-300 mb-2">
        Sketch your ideal week — the rhythm you want, not the schedule you
        have. Anchors, blocks, rituals. Update freely.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="card">
            <div className="card-glow" />
            <div className="text-xs uppercase tracking-[0.18em] text-accent-sky mb-2">
              {DAY_LABELS[day]}
            </div>
            <textarea
              value={week[day] ?? ""}
              onChange={(e) =>
                setWeek((prev) => ({ ...prev, [day]: e.target.value }))
              }
              rows={5}
              maxLength={2000}
              placeholder="Morning routine, blocks, rituals…"
              className="w-full bg-transparent text-sm text-ink-100 leading-relaxed focus:outline-none resize-none"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-400">
          {savedFlash ? "✓ saved" : "All seven days save together."}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-accent-sky/15 text-accent-sky border border-accent-sky/30 text-sm hover:bg-accent-sky/25 disabled:opacity-30 transition"
        >
          {submitting ? "Saving…" : "Save week"}
        </button>
      </div>
    </div>
  );
}
