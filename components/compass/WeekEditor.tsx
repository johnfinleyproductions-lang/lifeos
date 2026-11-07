"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type IdealWeek, DAYS, DAY_LABELS } from "@/lib/compass/schema";
import { SaveRow } from "./CompassEditor";

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
    <div className="space-y-6">
      <p className="text-[14.5px] text-ink-300 max-w-[62ch]">
        Sketch the rhythm you want, not the schedule you have. Anchors, blocks,
        rituals. Update freely.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="sheet focus-within:shadow-mis-sm">
            <div className="tab-row mb-2.5">
              <span className="tab">{DAY_LABELS[day]}</span>
              <span className="fill" />
            </div>
            <textarea
              value={week[day] ?? ""}
              onChange={(e) =>
                setWeek((prev) => ({ ...prev, [day]: e.target.value }))
              }
              rows={5}
              maxLength={2000}
              placeholder="Morning routine, blocks, rituals"
              aria-label={DAY_LABELS[day]}
              className="w-full bg-transparent border-0 p-0 outline-none resize-none font-serif text-[16px] leading-[1.55] text-ink-100 placeholder:text-ink-400 placeholder:italic"
            />
          </div>
        ))}
      </div>

      <SaveRow
        error={error}
        saved={savedFlash}
        idle="All seven days save together."
        submitting={submitting}
        onSave={save}
        label="Save week"
      />
    </div>
  );
}
