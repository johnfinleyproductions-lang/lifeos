"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { EveningShutdown } from "@/lib/manifesto/evening-schema";
import { VoiceButton } from "@/components/voice/VoiceButton";

function appendVoice(prev: string, text: string): string {
  return prev.trim().length > 0 ? `${prev} ${text}` : text;
}

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
  ritualDepth?: "standard" | "deep";
};

export function EveningWizard({
  initial,
  morningPriorities = [],
  ritualDepth = "standard",
}: Props) {
  const router = useRouter();
  const isDeep = ritualDepth === "deep";
  const totalSteps = isDeep ? 7 : 5;

  const [step, setStep] = useState(1);
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
  const [reframe, setReframe] = useState<string>(initial?.reframe ?? "");
  const [release, setRelease] = useState<string>(initial?.release ?? "");

  const hasPriorities = morningPriorities.length > 0;

  // Step 2 is "priorities check-in" if there are priorities, otherwise it's
  // the win step. We collapse the unused step rather than skipping numbers.
  const stepIsPriorityCheck = step === 2 && hasPriorities;
  const stepIsWin = (step === 2 && !hasPriorities) || step === 3;
  const stepIsLesson = (step === 3 && !hasPriorities) || step === 4;
  const stepIsTomorrow = (step === 4 && !hasPriorities) || step === 5;
  const stepIsReframe = isDeep && step === 6;
  const stepIsRelease = isDeep && step === 7;

  const canContinue =
    (step === 1 && Boolean(dayMood.trim())) ||
    stepIsPriorityCheck ||
    (stepIsWin && win.trim().length >= 2) ||
    (stepIsLesson && lesson.trim().length >= 2) ||
    (stepIsTomorrow && tomorrowSeed.trim().length >= 2) ||
    (stepIsReframe && reframe.trim().length >= 2) ||
    (stepIsRelease && release.trim().length >= 2);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: EveningShutdown = {
        dayRating,
        dayMood: dayMood.trim(),
        ...(hasPriorities ? { prioritiesDone } : {}),
        win: win.trim(),
        lesson: lesson.trim(),
        tomorrowSeed: tomorrowSeed.trim(),
        ...(isDeep && reframe.trim() ? { reframe: reframe.trim() } : {}),
        ...(isDeep && release.trim() ? { release: release.trim() } : {}),
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
    // Skip step 2 if no morning priorities, jump to step 3 logic.
    if (step === 1 && !hasPriorities) {
      setStep(3);
      return;
    }
    if (step === totalSteps) {
      submit();
    } else {
      setStep(step + 1);
    }
  }

  function back() {
    if (step === 3 && !hasPriorities) {
      setStep(1);
      return;
    }
    setStep(Math.max(1, step - 1));
  }

  // The bar shows one segment per step the user will actually see.
  const barSteps = hasPriorities ? totalSteps : totalSteps - 1;
  const barIndex = hasPriorities ? step : step === 1 ? 1 : step - 1;

  return (
    <div className="wiz">
      <div className="wiz-bar" aria-hidden="true">
        {Array.from({ length: barSteps }).map((_, i) => (
          <i
            key={i}
            className={
              i + 1 < barIndex ? "on" : i + 1 === barIndex ? "cur" : undefined
            }
          />
        ))}
      </div>

      <div className="wiz-card">
        <div className="wiz-step">
          Step {barIndex} of {barSteps}
        </div>

        {step === 1 && (
          <Step
            heading="How was the day, really?"
            subhead="No editing. Rate it from where you sit right now."
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
                  className="chip"
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
                className="inp"
              />
              <VoiceButton size="sm" onTranscript={(t) => setDayMood(t)} />
            </div>
          </Step>
        )}

        {stepIsPriorityCheck && (
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
                    className="w-full flex items-center gap-3 py-3 px-0.5 text-left border-b border-ink-600 last:border-b-[1.5px] last:border-b-ink-50 hover:bg-ink-700"
                  >
                    <span
                      className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                      style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                    >
                      {i + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-[22px] h-[22px] shrink-0 border-[1.5px] relative ${
                        done
                          ? "bg-accent-spot border-accent-spot"
                          : "border-ink-50 bg-ink-700"
                      }`}
                    >
                      {done && (
                        <span className="absolute left-[5px] top-[9px] w-[9px] h-[4px] border-white border-b-[2.5px] border-l-[2.5px] rotate-[-45deg]" />
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

        {stepIsWin && (
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
            />
          </Step>
        )}

        {stepIsLesson && (
          <Step
            heading="What am I carrying forward?"
            subhead={
              isDeep
                ? "A pattern you noticed in yourself. A reframe. A line drawn in the sand."
                : "One lesson, one reframe, or one note for next time."
            }
          >
            <Writing
              value={lesson}
              onChange={setLesson}
              rows={3}
              max={280}
              placeholder="that I get distracted at the planning step, not the execution step"
            />
          </Step>
        )}

        {stepIsTomorrow && (
          <Step
            heading="Tomorrow's seed."
            subhead="One thing to plant tonight that tomorrow-you will be glad you started."
          >
            <Writing
              value={tomorrowSeed}
              onChange={setTomorrowSeed}
              rows={2}
              max={200}
              placeholder="open the file before coffee"
            />
          </Step>
        )}

        {stepIsReframe && (
          <Step
            heading="A moment that hooked you today. What is the reframe?"
            subhead="The story you told yourself, then the story that is actually true."
          >
            <Writing
              value={reframe}
              onChange={setReframe}
              rows={4}
              max={280}
              placeholder="Story I told myself: ... Truer story: ..."
            />
          </Step>
        )}

        {stepIsRelease && (
          <Step
            heading="What can you release before sleep?"
            subhead="A worry, a grudge, an open thread. Name it so it stops circling."
          >
            <Writing
              value={release}
              onChange={setRelease}
              rows={3}
              max={280}
              placeholder="the email I am anxious about. It can wait until morning."
            />
          </Step>
        )}

        {error && (
          <div className="alert mt-4" role="alert">
            {error} Nothing was lost; press it again.
          </div>
        )}

        <div className="wiz-foot">
          {step > 1 ? (
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
            type="button"
            onClick={next}
            disabled={!canContinue || submitting}
            className={`btn btn-next ${step === totalSteps ? "btn-spot" : ""}`}
          >
            {submitting
              ? "Saving"
              : step === totalSteps
                ? "Close the day"
                : "Next"}
          </button>
        </div>
      </div>
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
}: {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  rows: number;
  max: number;
  placeholder: string;
}) {
  const near = max - Math.round(max * 0.08);
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
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
