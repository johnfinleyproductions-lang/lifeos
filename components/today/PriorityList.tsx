"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { strikePriority } from "./actions";

/**
 * The three, as ledger rows with working checkboxes.
 *
 * Each box is a real <input type="checkbox"> in the house `.ck` style,
 * so it is keyboard-reachable and reads as a checkbox to a screen
 * reader. A strike is shown at once and written through a server
 * action; if the write fails the box falls back and a line says so.
 *
 * `readOnly` prints the same rows without the inputs, for the closed
 * day, where the record is the evening's and the row reads as struck
 * or not rather than as something to do.
 */
export function PriorityList({
  priorities,
  done,
  readOnly = false,
  size = "full",
}: {
  priorities: string[];
  done: boolean[];
  readOnly?: boolean;
  size?: "full" | "compact";
}) {
  const [flags, setFlags] = useState<boolean[]>(
    priorities.map((_, i) => done[i] ?? false),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(i: number) {
    const next = !flags[i];
    const before = flags;
    setFlags(flags.map((f, j) => (j === i ? next : f)));
    setError(null);
    startTransition(async () => {
      const res = await strikePriority(i, next);
      if (!res.ok) {
        setFlags(before);
        setError(res.error ?? "The strike did not save.");
      }
    });
  }

  const full = size === "full";

  return (
    <div>
      <div className="border-t-[1.5px] border-ink-50">
        {priorities.map((p, i) => {
          const struck = flags[i];
          const id = `priority-${i}`;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-0.5 border-b border-ink-600 last:border-b-[1.5px] last:border-b-ink-50 ${
                full ? "py-3.5" : "py-2.5"
              }`}
            >
              {full ? (
                <span
                  className={`folio folio-sm text-[44px] w-[36px] shrink-0 text-center ${
                    struck ? "folio-struck" : ""
                  }`}
                  data-n={i + 1}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              ) : (
                <span
                  className="w-[26px] shrink-0 tabular-nums text-ink-400 text-[13px]"
                  style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              )}
              {readOnly ? (
                <span
                  aria-hidden="true"
                  className={`w-[22px] h-[22px] shrink-0 border-[1.5px] relative ${
                    struck
                      ? "bg-accent-spot border-ink-50"
                      : "border-ink-50 bg-ink-700"
                  }`}
                >
                  {struck && (
                    <span className="absolute left-[5px] top-[9px] w-[9px] h-[4px] border-white border-b-[2.5px] border-l-[2.5px] rotate-[-45deg]" />
                  )}
                </span>
              ) : (
                <input
                  id={id}
                  type="checkbox"
                  className="ck"
                  checked={struck}
                  disabled={pending}
                  onChange={() => toggle(i)}
                  aria-label={`Strike: ${p}`}
                />
              )}
              <label
                htmlFor={readOnly ? undefined : id}
                className={`flex-1 min-w-0 leading-[1.3] ${
                  readOnly ? "" : "cursor-pointer"
                } ${full ? "text-[clamp(17px,1.6vw,21px)]" : "text-[15px]"} ${
                  struck
                    ? "text-ink-400 line-through decoration-accent-spot decoration-2"
                    : ""
                }`}
                style={{ fontVariationSettings: full ? "'wght' 600" : "'wght' 540" }}
              >
                {readOnly && (
                  <span className="sr-only">
                    {struck ? "Struck: " : "Not struck: "}
                  </span>
                )}
                {p}
              </label>
              {/* A priority is usually the next thing to sit down with, and
                  the way there used to be: open Focus, retype it. */}
              {full && !readOnly && !struck && (
                <Link
                  href={`/focus?label=${encodeURIComponent(p)}`}
                  className="btn btn-sm btn-ghost shrink-0"
                  aria-label={`Start a focus block on: ${p}`}
                >
                  Sit with it
                </Link>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <div className="alert mt-3" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
