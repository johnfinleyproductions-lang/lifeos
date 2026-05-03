"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuturePaths } from "@/lib/compass/schema";

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
    prompt: "Three years out — what's true that isn't true today?",
  },
  {
    key: "fiveYear",
    label: "5 years",
    prompt: "Five years from now — describe the day, the work, the people.",
  },
  {
    key: "tenYear",
    label: "10 years",
    prompt:
      "Ten years out — the long view. What does the life look like?",
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
    <div className="space-y-6">
      {HORIZONS.map((h) => (
        <div key={h.key}>
          <div className="mb-2">
            <div className="text-xs uppercase tracking-[0.18em] text-accent-violet">
              {h.label}
            </div>
            <div className="font-serif text-lg text-ink-100 mt-0.5">
              {h.prompt}
            </div>
          </div>
          <textarea
            value={paths[h.key] ?? ""}
            onChange={(e) =>
              setPaths((prev) => ({ ...prev, [h.key]: e.target.value }))
            }
            rows={4}
            maxLength={2000}
            placeholder="Sketch it…"
            className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-accent-violet/40 focus:outline-none resize-none"
          />
        </div>
      ))}

      {error && (
        <div className="text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-400">
          {savedFlash
            ? "✓ saved"
            : "Future-self sketches. Update as the picture sharpens."}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-sm hover:bg-accent-violet/25 disabled:opacity-30 transition"
        >
          {submitting ? "Saving…" : "Save future"}
        </button>
      </div>
    </div>
  );
}
