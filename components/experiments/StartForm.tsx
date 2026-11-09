"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LENGTHS, lengthWords, sentence } from "@/lib/experiments/rules";

export type Prefill = {
  action: string;
  curiosity: string;
  cadence: string;
  lengthDays: number;
  previousId: string;
};

const IDEAS = [
  "write for fifteen minutes before breakfast",
  "walk before opening the laptop",
  "read ten pages after lunch",
  "leave the phone outside the bedroom",
  "plan tomorrow's three before closing the day",
];

/**
 * Starting one. The form is the sentence: I will [action] for [length],
 * because I am curious whether [question]. An action, not an outcome, and
 * small enough to do on a bad day.
 */
export function StartForm({
  full,
  prefill,
  onStarted,
}: {
  /** Two are already in play. */
  full: boolean;
  prefill: Prefill | null;
  onStarted: () => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState("");
  const [curiosity, setCuriosity] = useState("");
  const [lengthDays, setLengthDays] = useState<number>(10);
  const [rhythm, setRhythm] = useState<"daily" | "weekdays" | "times">("daily");
  const [times, setTimes] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefill) return;
    setAction(prefill.action);
    setCuriosity(prefill.curiosity);
    setLengthDays(prefill.lengthDays);
    if (prefill.cadence.startsWith("x")) {
      setRhythm("times");
      setTimes(Number(prefill.cadence.slice(1)));
    } else {
      setRhythm(prefill.cadence === "weekdays" ? "weekdays" : "daily");
    }
  }, [prefill]);

  // A number of times a week only makes sense over whole weeks.
  const lengths = LENGTHS.filter((n) => rhythm !== "times" || n % 7 === 0);
  const length = lengths.includes(lengthDays as (typeof LENGTHS)[number]) ? lengthDays : 14;
  const cadence = rhythm === "times" ? `x${times}` : rhythm;
  const ready = action.trim().length >= 3;

  async function start() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.trim(),
          curiosity: curiosity.trim() || undefined,
          cadence,
          lengthDays: length,
          previousId: prefill?.previousId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That did not save.");
      }
      setAction("");
      setCuriosity("");
      onStarted();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  if (full) {
    return (
      <div className="sheet sheet-bare" id="start">
        <div className="t-h2 mb-1.5">Start one</div>
        <p className="text-[14px] text-ink-300 m-0 max-w-[52ch]">
          Two are running, which is the most this page will hold. An experiment needs some of your
          attention to tell you anything. Close one and the space opens up.
        </p>
      </div>
    );
  }

  return (
    <div className="sheet" id="start">
      <div className="t-h2 mb-1">{prefill ? "The changed version" : "Start one"}</div>
      <p className="text-[13.5px] text-ink-300 mt-0 mb-4 max-w-[52ch]">
        Something you do, not something you hope happens. Small enough for a bad day. It ends on a
        date, and then you choose.
      </p>

      <label htmlFor="exp-action" className="block text-[15px] mb-1.5" style={{ fontVariationSettings: "'wght' 740" }}>
        I will
      </label>
      <input
        id="exp-action"
        className="inp"
        value={action}
        maxLength={200}
        onChange={(e) => setAction(e.target.value)}
        placeholder="read ten pages after lunch"
      />
      {!prefill && action.trim() === "" && (
        <div className="mt-2">
          <div className="lbl mb-1.5">Stuck for one? Borrow a start and change it.</div>
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button key={idea} type="button" className="chip min-h-9" onClick={() => setAction(idea)}>
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-[15px] mt-4 mb-1.5" style={{ fontVariationSettings: "'wght' 740" }} id="exp-rhythm">
        how often
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="exp-rhythm">
        {(
          [
            ["daily", "Every day"],
            ["weekdays", "Weekdays"],
            ["times", "A few times a week"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="chip min-h-9"
            aria-pressed={rhythm === value}
            onClick={() => setRhythm(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {rhythm === "times" && (
        <div className="flex flex-wrap gap-1.5 mt-1.5" role="group" aria-label="Times a week">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className="chip min-h-9" aria-pressed={times === n} onClick={() => setTimes(n)}>
              {n}
            </button>
          ))}
          <span className="lbl self-center ml-1">a week</span>
        </div>
      )}

      <div className="text-[15px] mt-4 mb-1.5" style={{ fontVariationSettings: "'wght' 740" }} id="exp-length">
        for
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="exp-length">
        {lengths.map((n) => (
          <button key={n} type="button" className="chip min-h-9" aria-pressed={length === n} onClick={() => setLengthDays(n)}>
            {lengthWords(n)}
          </button>
        ))}
      </div>

      <label htmlFor="exp-curiosity" className="block text-[15px] mt-4 mb-1.5" style={{ fontVariationSettings: "'wght' 740" }}>
        because I am curious whether
      </label>
      <input
        id="exp-curiosity"
        className="inp"
        value={curiosity}
        maxLength={280}
        onChange={(e) => setCuriosity(e.target.value)}
        placeholder="an afternoon read steadies the rest of the day"
      />

      {ready && (
        <p className="font-serif text-[18px] leading-[1.35] mt-4 mb-0" aria-live="polite">
          {sentence({ action, cadence, lengthDays: length })}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-4">
        <button type="button" className="btn" disabled={!ready || busy} onClick={start}>
          {busy ? "Starting" : "Start the experiment"}
        </button>
        <span className="lbl">It starts today.</span>
      </div>
      {error && (
        <div className="mt-3 text-[13.5px] text-accent-rose" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
