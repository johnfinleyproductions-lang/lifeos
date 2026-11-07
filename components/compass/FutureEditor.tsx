"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuturePaths } from "@/lib/compass/schema";
import { SaveRow } from "./CompassEditor";

const HORIZONS: {
  key: keyof FuturePaths;
  label: string;
  prompt: string;
}[] = [
  {
    key: "oneYear",
    label: "1 year",
    prompt: "By next year, who am I becoming?",
  },
  {
    key: "threeYear",
    label: "3 years",
    prompt: "Three years out. What is true that is not true today?",
  },
  {
    key: "fiveYear",
    label: "5 years",
    prompt: "Five years from now. Describe the day, the work, the people.",
  },
  {
    key: "tenYear",
    label: "10 years",
    prompt: "Ten years out, the long view. What does the life look like?",
  },
];

export function FutureEditor({ initial }: { initial: FuturePaths }) {
  const router = useRouter();
  const [paths, setPaths] = useState<FuturePaths>({
    oneYear: initial.oneYear ?? "",
    threeYear: initial.threeYear ?? "",
    fiveYear: initial.fiveYear ?? "",
    tenYear: initial.tenYear ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      // Strip empty strings so they don't save as ""
      const futurePaths: FuturePaths = {};
      for (const h of HORIZONS) {
        const v = paths[h.key]?.trim();
        if (v) futurePaths[h.key] = v;
      }
      const res = await fetch("/api/compass", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ futurePaths }),
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
    <div className="space-y-7">
      {HORIZONS.map((h) => (
        <section key={h.key}>
          <div className="tab-row mb-2.5">
            <span className="tab">{h.label}</span>
            <span className="fill" />
          </div>
          <p className="t-h2 mb-3">{h.prompt}</p>
          <textarea
            value={paths[h.key] ?? ""}
            onChange={(e) =>
              setPaths((prev) => ({ ...prev, [h.key]: e.target.value }))
            }
            rows={4}
            maxLength={2000}
            placeholder="Sketch it"
            className="ta"
          />
        </section>
      ))}

      <SaveRow
        error={error}
        saved={savedFlash}
        idle="Future-self sketches. Update as the picture sharpens."
        submitting={submitting}
        onSave={save}
        label="Save future"
      />
    </div>
  );
}
