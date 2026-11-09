"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExperimentView } from "@/lib/experiments/load";
import { OUTCOME_WORDS, type Outcome } from "@/lib/experiments/rules";

/** One ended experiment: the sentence, the count, what it taught, how it ended. */
export function ShelfRow({ exp }: { exp: ExperimentView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const outcome = (exp.outcome ?? "paused") as Outcome;
  const kept = outcome === "again" || outcome === "habit";
  const lines = [
    ["What worked", exp.worked],
    ["What did not", exp.didNot],
    ["What next", exp.nextStep],
  ].filter(([, v]) => v && v.trim()) as [string, string][];

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/experiments/${exp.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <li className="py-3.5 border-t border-ink-500 first:border-t-0" data-shelf={exp.id}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
        <div>
          <p className="font-serif text-[18px] leading-[1.35] m-0">{exp.sentence}</p>
          <div className="lbl mt-1">
            {exp.month}
            {exp.round > 1 ? `, round ${exp.round}` : ""}. {exp.tally}
            {exp.endedEarly ? " Ended early." : ""}
          </div>
        </div>
        <span className={kept ? "tab" : "tab bg-transparent text-ink-50 shadow-[inset_0_0_0_1.5px_rgb(var(--text-1))]"}>
          {OUTCOME_WORDS[outcome]}
        </span>
      </div>
      {(lines.length > 0 || exp.notes.length > 0) && (
        <button type="button" className="lbl underline mt-2" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Fold it away" : "What it taught"}
        </button>
      )}
      {open && (
        <div className="mt-2.5 space-y-2.5">
          {lines.map(([label, value]) => (
            <div key={label}>
              <div className="lbl">{label}</div>
              <p className="font-serif text-[16.5px] leading-[1.45] m-0">{value}</p>
            </div>
          ))}
          {exp.notes.length > 0 && (
            <div>
              <div className="lbl">Field notes</div>
              <ul className="m-0 p-0 list-none">
                {exp.notes.map((n) => (
                  <li key={n.day} className="font-serif text-[16px] leading-[1.45] py-0.5">
                    <span className="font-sans text-[12px] text-ink-400 mr-2">Day {n.n}</span>
                    {n.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-1">
            {asking ? (
              <span className="lbl">
                Remove it and its notes for good?{" "}
                <button type="button" className="underline" disabled={busy} onClick={remove}>
                  Yes, remove
                </button>{" "}
                <button type="button" className="underline" onClick={() => setAsking(false)}>
                  Keep it
                </button>
              </span>
            ) : (
              <button type="button" className="lbl underline" onClick={() => setAsking(true)}>
                Remove from the shelf
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
