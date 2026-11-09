"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExperimentView } from "@/lib/experiments/load";
import type { Outcome } from "@/lib/experiments/rules";

const CHOICES: { value: Outcome; label: string; desc: string }[] = [
  { value: "again", label: "Keep going", desc: "The same sentence, another round, starting today." },
  { value: "habit", label: "Make it a habit", desc: "It moves to Habits and stops being an experiment." },
  { value: "paused", label: "Pause it", desc: "It goes on the shelf as it is. You can come back to it." },
  { value: "changed", label: "Change it and run again", desc: "Adjust the sentence and try the new version." },
];

/**
 * The end of an experiment: what worked, what did not, what next, and then
 * one of three ways on (keep going, pause, change). Keeping going has two
 * forms here, another round or a habit.
 *
 * The record is shown before the questions, as a count and, when one reason
 * for not doing it kept recurring, that reason. No grade.
 */
export function CloseForm({
  exp,
  early = false,
  onCancel,
  onChanged,
}: {
  exp: ExperimentView;
  early?: boolean;
  onCancel?: () => void;
  onChanged: (exp: ExperimentView) => void;
}) {
  const router = useRouter();
  const [worked, setWorked] = useState("");
  const [didNot, setDidNot] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function close(outcome: Outcome) {
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, worked, didNot, nextStep }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That did not save.");
      }
      if (outcome === "changed") onChanged(exp);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
      setBusy(null);
    }
  }

  const fields: { id: string; label: string; hint: string; value: string; set: (v: string) => void }[] = [
    { id: "worked", label: "What worked", hint: "What you enjoyed, what came easily, what you would want more of.", value: worked, set: setWorked },
    { id: "didnot", label: "What did not", hint: "What dragged, what got in the way, what you would drop.", value: didNot, set: setDidNot },
    { id: "next", label: "What next", hint: "The one adjustment worth trying.", value: nextStep, set: setNextStep },
  ];

  return (
    <div className="sheet" data-close={exp.id}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="t-h2">{early ? "Ending it early" : "Look back, then choose"}</div>
        {onCancel && (
          <button type="button" className="lbl underline" onClick={onCancel}>
            Not yet
          </button>
        )}
      </div>
      {/* When it ran its course, the card above already carries the sentence and the count. */}
      {early && (
        <>
          <p className="font-serif text-[21px] leading-[1.3] m-0">{exp.sentence}</p>
          <p className="mt-2 mb-0 text-[14px]" style={{ fontVariationSettings: "'wght' 660" }}>
            {exp.tally}
          </p>
        </>
      )}
      {exp.pattern && <p className="mt-1 mb-0 text-[13.5px] text-ink-300">{exp.pattern}</p>}
      {exp.curiosity && (
        <p className="mt-2 mb-0 text-[13.5px] text-ink-300">
          You were curious whether{" "}
          <span className="font-serif italic text-[16px] text-ink-100">{exp.curiosity}</span>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {fields.map((f) => (
          <div key={f.id}>
            <label
              htmlFor={`${f.id}-${exp.id}`}
              className="block text-[13.5px] mb-1"
              style={{ fontVariationSettings: "'wght' 720" }}
            >
              {f.label}
            </label>
            <textarea
              id={`${f.id}-${exp.id}`}
              className="ta"
              rows={3}
              maxLength={600}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.hint}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t-[1.5px] border-ink-50">
        <div className="lbl mb-2">So, what happens to it?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHOICES.map((c, i) => (
            <button
              key={c.value}
              type="button"
              disabled={busy !== null}
              onClick={() => close(c.value)}
              className={`text-left px-3.5 py-3 border-[1.5px] border-ink-50 ${
                i === 0 ? "bg-ink-50 text-knock" : "bg-ink-700 hover:bg-ink-800"
              }`}
            >
              <div className="text-[15px]" style={{ fontVariationSettings: "'wght' 720" }}>
                {busy === c.value ? "Saving" : c.label}
              </div>
              <div className={`text-[12.5px] mt-0.5 ${i === 0 ? "opacity-75" : "text-ink-300"}`}>
                {c.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="mt-3 text-[13.5px] text-accent-rose" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
