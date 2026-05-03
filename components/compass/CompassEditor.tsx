"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initial: {
    mission: string | null;
    eulogy: string | null;
    successDefinition: string | null;
  };
};

export function CompassEditor({ initial }: Props) {
  const router = useRouter();
  const [mission, setMission] = useState(initial.mission ?? "");
  const [eulogy, setEulogy] = useState(initial.eulogy ?? "");
  const [success, setSuccess] = useState(initial.successDefinition ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compass", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: mission.trim() || undefined,
          eulogy: eulogy.trim() || undefined,
          successDefinition: success.trim() || undefined,
        }),
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
      <Field
        label="Mission"
        sub="One sentence. The thing your life is for."
        accent="text-accent-violet"
      >
        <textarea
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="My mission is to…"
          className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 font-serif text-base leading-snug focus:border-accent-violet/40 focus:outline-none resize-none"
        />
      </Field>

      <Field
        label="Eulogy"
        sub="How do you want to be remembered? Write it in third person."
        accent="text-accent-rose"
      >
        <textarea
          value={eulogy}
          onChange={(e) => setEulogy(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="They were the kind of person who…"
          className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 font-serif text-base leading-snug focus:border-accent-rose/40 focus:outline-none resize-none"
        />
      </Field>

      <Field
        label="Definition of success"
        sub="Yours, not anyone else's. What does a good life look like for you?"
        accent="text-accent-gold"
      >
        <textarea
          value={success}
          onChange={(e) => setSuccess(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Success looks like…"
          className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-accent-gold/40 focus:outline-none resize-none"
        />
      </Field>

      {error && (
        <div className="text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-400">
          {savedFlash ? "✓ saved" : "Save updates the same compass row."}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-sm hover:bg-accent-violet/25 disabled:opacity-30 transition"
        >
          {submitting ? "Saving…" : "Save compass"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  sub,
  accent,
  children,
}: {
  label: string;
  sub: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <div className={`text-xs uppercase tracking-[0.18em] ${accent}`}>
          {label}
        </div>
        <div className="text-sm text-ink-300 mt-0.5">{sub}</div>
      </div>
      {children}
    </div>
  );
}
