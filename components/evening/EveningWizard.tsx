"use client";

import { WizPlate } from "@/components/field/WizPlate";
import {
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type {
  EveningRequest,
  EveningShutdown,
} from "@/lib/manifesto/evening-schema";
import {
  DEPTH_CHOICES,
  type DepthChoice,
} from "@/lib/settings/ritual-depth";
import { VoiceButton } from "@/components/voice/VoiceButton";

function appendVoice(prev: string, text: string): string {
  return prev.trim().length > 0 ? `${prev} ${text}` : text;
}

/**
 * The cards, by depth. Quick: rate the day, strike the three, one line
 * for the win (with the seed offered as an optional second line, so the
 * morning still has something to inherit). Full adds the lesson and gives
 * the seed its own card. The strike card only deals when the morning set
 * priorities to strike.
 */
type StepId = "rate" | "strike" | "win" | "lesson" | "seed";

/** Each card's engraving and the two words that name it. */
const STEP_PLATE: Record<StepId, { plate: string; name: string }> = {
  rate: { plate: "disc", name: "the reading" },
  strike: { plate: "flag", name: "the three" },
  win: { plate: "sheaf", name: "the win" },
  lesson: { plate: "lantern", name: "the lesson" },
  seed: { plate: "sprout", name: "the seed" },
};

const STEPS: Record<DepthChoice, StepId[]> = {
  quick: ["rate", "strike", "win"],
  full: ["rate", "strike", "win", "lesson", "seed"],
};

const RATING_LABELS = ["off", "rough", "okay", "good", "alive"] as const;

const MOOD_OPTIONS = [
  "satisfied",
  "spent",
  "frustrated",
  "proud",
  "scattered",
  "peaceful",
  "restless",
  "honest",
];

type Props = {
  initial?: EveningShutdown | null;
  morningPriorities?: string[];
  initialDepth?: DepthChoice;
};

export function EveningWizard({
  initial,
  morningPriorities = [],
  initialDepth = "full",
}: Props) {
  const router = useRouter();
  const hasPriorities = morningPriorities.length > 0;

  const [depth, setDepth] = useState<DepthChoice>(initialDepth);
  const steps = STEPS[depth].filter((s) => s !== "strike" || hasPriorities);
  const [index, setIndex] = useState(0);
  const stepId = steps[Math.min(index, steps.length - 1)];
  const total = steps.length;
  const isLast = index === total - 1;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dayRating, setDayRating] = useState<number>(initial?.dayRating ?? 3);
  const [dayMood, setDayMood] = useState<string>(initial?.dayMood ?? "");
  const [prioritiesDone, setPrioritiesDone] = useState<boolean[]>(
    initial?.prioritiesDone ?? Array(morningPriorities.length).fill(false),
  );
  const [win, setWin] = useState<string>(initial?.win ?? "");
  const [lesson, setLesson] = useState<string>(initial?.lesson ?? "");
  const [tomorrowSeed, setTomorrowSeed] = useState<string>(
    initial?.tomorrowSeed ?? "",
  );

  const canContinue =
    (stepId === "rate" && Boolean(dayMood.trim())) ||
    stepId === "strike" ||
    (stepId === "win" && win.trim().length >= 2) ||
    (stepId === "lesson" && lesson.trim().length >= 2) ||
    (stepId === "seed" && tomorrowSeed.trim().length >= 2);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Fields a Quick evening does not ask keep whatever an earlier Full
      // pass wrote, so revising at Quick never erases the lesson.
      const payload: EveningRequest = {
        dayRating,
        dayMood: dayMood.trim(),
        ...(hasPriorities ? { prioritiesDone } : {}),
        win: win.trim(),
        lesson: lesson.trim(),
        tomorrowSeed: tomorrowSeed.trim(),
        ...(initial?.reframe ? { reframe: initial.reframe } : {}),
        ...(initial?.release ? { release: initial.release } : {}),
        depth,
      };
      const res = await fetch("/api/evening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSubmitting(false);
    }
  }

  function next() {
    if (!canContinue || submitting) return;
    if (isLast) submit();
    else setIndex(index + 1);
  }
  function back() {
    setIndex(Math.max(0, index - 1));
  }

  return (
    <div className="wiz">
      <div className="wiz-bar" aria-hidden="true">
        {steps.map((id, i) => (
          <i
            key={id}
            className={i < index ? "on" : i === index ? "cur" : undefined}
          />
        ))}
      </div>

      <form
        key={`${depth}-${stepId}`}
        className="wiz-card wiz-plated"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <WizPlate
          n={index + 1}
          total={total}
          plate={STEP_PLATE[stepId].plate}
          name={STEP_PLATE[stepId].name}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="wiz-step mb-0 sr-only">
            Step {index + 1} of {total}
          </div>
          {stepId === "rate" && (
            <div
              className="flex items-center gap-1.5"
              role="group"
              aria-label="Depth"
            >
              {DEPTH_CHOICES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setDepth(c.key)}
                  aria-pressed={depth === c.key}
                  className="chip min-h-9"
                >
                  <span>
                    {c.label}
                    <span className="opacity-60 font-normal">, {c.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-[9px]" />

        {stepId === "rate" && (
          <Step
            heading="How was the day, really?"
            subhead="From where you sit right now. It can be revised later; tonight it only has to be honest."
          >
            <div className="pick" role="group" aria-label="Day rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDayRating(n)}
                  aria-pressed={dayRating === n}
                >
                  <span
                    className="block text-lg"
                    style={{ fontVariationSettings: "'wdth' 100, 'wght' 700" }}
                  >
                    {n}
                  </span>
                  <span className="block text-[10.5px] mt-0.5 opacity-70">
                    {RATING_LABELS[n - 1]}
                  </span>
                </button>
              ))}
            </div>

            <p className="wiz-h mt-6 mb-3">And what does the body say?</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDayMood(m)}
                  aria-pressed={dayMood === m}
                  className="chip min-h-9"
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={MOOD_OPTIONS.includes(dayMood) ? "" : dayMood}
                onChange={(e) => setDayMood(e.target.value)}
                placeholder="or type your own"
                aria-label="Mood, in your own word"
                className="inp"
              />
              <VoiceButton size="sm" onTranscript={(t) => setDayMood(t)} />
            </div>
            <p className="text-[11.5px] text-ink-400 mt-5 mb-0">
              {depth === "quick"
                ? hasPriorities
                  ? "Quick: the rating, strike the three, one line for the win. Remembered for tomorrow."
                  : "Quick: the rating, one line for the win. Remembered for tomorrow."
                : hasPriorities
                  ? "Full: the rating, strike the three, the win, the lesson, tomorrow's seed. Remembered for tomorrow."
                  : "Full: the rating, the win, the lesson, tomorrow's seed. Remembered for tomorrow."}
            </p>
          </Step>
        )}

        {stepId === "strike" && (
          <Step
            heading="The three you set this morning."
            subhead="Strike the ones that actually got done. No judgment if it is none."
          >
            <div className="border-t-[1.5px] border-ink-50">
              {morningPriorities.map((p, i) => {
                const done = prioritiesDone[i] ?? false;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={done}
                    onClick={() => {
                      const next = [...prioritiesDone];
                      next[i] = !done;
                      setPrioritiesDone(next);
                    }}
                    className="w-full flex items-center gap-3 py-3 px-0.5 text-left border-b border-ink-600 last:border-b-[1.5px] last:border-b-ink-50 hover:bg-ink-700 min-h-12"
                  >
                    <span
                      className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                      style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                    >
                      {i + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-[26px] h-[26px] shrink-0 border-[1.5px] relative ${
                        done
                          ? "bg-accent-spot border-accent-spot"
                          : "border-ink-50 bg-ink-700"
                      }`}
                    >
                      {done && (
                        <span className="absolute left-[6px] top-[10px] w-[11px] h-[5px] border-white border-b-[2.5px] border-l-[2.5px] rotate-[-45deg]" />
                      )}
                    </span>
                    <span
                      className={`flex-1 min-w-0 text-[15.5px] leading-[1.35] ${
                        done
                          ? "text-ink-400 line-through decoration-accent-spot decoration-2"
                          : ""
                      }`}
                      style={{ fontVariationSettings: "'wght' 540" }}
                    >
                      {p}
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {stepId === "win" && (
          <Step
            heading="One thing that went well."
            subhead="Specific. Tiny is fine. The smallest noticed wins compound."
          >
            <Writing
              value={win}
              onChange={setWin}
              rows={3}
              max={280}
              placeholder="I shipped the thing I had been circling for a week."
              label="The win"
            />
            {depth === "quick" && (
              <div className="mt-5 pt-4 border-t-[1.5px] border-ink-500">
                <label
                  htmlFor="quick-seed"
                  className="block text-[13px] text-ink-300 mb-2"
                  style={{ fontVariationSettings: "'wght' 620" }}
                >
                  And a seed for tomorrow, if one is there. Optional.
                </label>
                <input
                  id="quick-seed"
                  type="text"
                  value={tomorrowSeed}
                  onChange={(e) => setTomorrowSeed(e.target.value)}
                  maxLength={200}
                  placeholder="open the file before coffee"
                  className="inp"
                />
              </div>
            )}
          </Step>
        )}

        {stepId === "lesson" && (
          <Step
            heading="What am I carrying forward?"
            subhead="One lesson, one reframe, or one note for next time."
          >
            <Writing
              value={lesson}
              onChange={setLesson}
              rows={3}
              max={280}
              placeholder="that I get distracted at the planning step, not the execution step"
              label="The lesson"
            />
          </Step>
        )}

        {stepId === "seed" && (
          <Step
            heading="Tomorrow's seed."
            subhead="One thing to plant tonight. It will be waiting on tomorrow's sheet, first in line."
          >
            <Writing
              value={tomorrowSeed}
              onChange={setTomorrowSeed}
              rows={2}
              max={200}
              placeholder="open the file before coffee"
              label="Tomorrow's seed"
            />
          </Step>
        )}

        {error && (
          <div className="alert mt-4" role="alert">
            {error} Nothing was lost; press it again.
          </div>
        )}

        <div className="wiz-foot">
          {index > 0 ? (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="btn btn-ghost"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={!canContinue || submitting}
            className={`btn btn-next ${isLast ? "btn-spot" : ""}`}
          >
            {submitting ? "Saving" : isLast ? "Close the day" : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Step({
  heading,
  subhead,
  children,
}: {
  heading: string;
  subhead: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="wiz-q">{heading}</h2>
      <p className="wiz-h">{subhead}</p>
      {children}
    </div>
  );
}

/** A writing field with the mic beside it and the count under it. */
function Writing({
  value,
  onChange,
  rows,
  max,
  placeholder,
  label,
}: {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  rows: number;
  max: number;
  placeholder: string;
  label: string;
}) {
  const near = max - Math.round(max * 0.08);
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        aria-label={label}
        className="ta"
      />
      <div className="flex items-center justify-between mt-2">
        <VoiceButton
          size="sm"
          onTranscript={(t) => onChange((prev) => appendVoice(prev, t))}
        />
        <span className={`wiz-count ${value.length > near ? "over" : ""}`}>
          {value.length}/{max}
        </span>
      </div>
    </>
  );
}
