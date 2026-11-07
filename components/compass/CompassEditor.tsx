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
    <div className="space-y-7">
      <Field label="Mission" sub="One sentence. The thing your life is for.">
        <textarea
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="My mission is to"
          className="ta"
        />
      </Field>

      <Field
        label="Eulogy"
        sub="How do you want to be remembered? Write it in the third person."
      >
        <textarea
          value={eulogy}
          onChange={(e) => setEulogy(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="They were the kind of person who"
          className="ta"
        />
      </Field>

      <Field
        label="Definition of success"
        sub="Yours, not anyone else's. What does a good life look like for you?"
      >
        <textarea
          value={success}
          onChange={(e) => setSuccess(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Success looks like"
          className="ta"
        />
      </Field>

      <SaveRow
        error={error}
        saved={savedFlash}
        idle="Save updates the same compass row."
        submitting={submitting}
        onSave={save}
        label="Save compass"
      />
    </div>
  );
}

function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="tab-row mb-2.5">
        <span className="tab">{label}</span>
        <span className="fill" />
      </div>
      <p className="text-[13.5px] text-ink-300 mb-2.5">{sub}</p>
      {children}
    </section>
  );
}

/** The save row the three compass editors share. */
export function SaveRow({
  error,
  saved,
  idle,
  submitting,
  onSave,
  label,
}: {
  error: string | null;
  saved: boolean;
  idle: string;
  submitting: boolean;
  onSave: () => void;
  label: string;
}) {
  return (
    <>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pt-5 border-t-[1.5px] border-ink-50">
        <span
          className={`text-[12.5px] ${saved ? "text-accent-spot" : "text-ink-400"}`}
          style={saved ? { fontVariationSettings: "'wght' 700" } : undefined}
          role="status"
        >
          {saved ? "Saved" : idle}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={submitting}
          className="btn btn-spot shrink-0"
        >
          {submitting ? "Saving" : label}
        </button>
      </div>
    </>
  );
}
