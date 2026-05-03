"use client";

import { useState } from "react";
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
    initial?.prioritiesDone ??
      Array(morningPriorities.length).fill(false),
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

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="card-glow" />

      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400">
          Evening shutdown · {step} / {totalSteps}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full transition ${
                i < step ? "bg-accent-rose" : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[280px]">
        {step === 1 && (
          <Step
            heading="How was the day, really?"
            subhead="No editing — just rate it from where you sit right now."
          >
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDayRating(n)}
                  className={`py-3 rounded-lg border text-sm transition ${
                    dayRating === n
                      ? "border-accent-rose bg-accent-rose/10 text-accent-rose"
                      : "border-white/5 text-ink-300 hover:border-white/15"
                  }`}
                >
                  <div className="font-serif text-xl">{n}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5">
                    {RATING_LABELS[n - 1]}
                  </div>
                </button>
              ))}
            </div>

            <Label>And what does the body say?</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDayMood(m)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    dayMood === m
                      ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                      : "border-white/10 text-ink-300 hover:border-white/30"
                  }`}
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
                placeholder="…or type your own"
                className="flex-1 bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-accent-violet focus:outline-none"
              />
              <VoiceButton
                size="sm"
                onTranscript={(t) => setDayMood(t)}
              />
            </div>
          </Step>
        )}

        {stepIsPriorityCheck && (
          <Step
            heading="The three you set this morning."
            subhead="Tap the ones that actually got done. No judgment if it's zero."
          >
            <div className="space-y-2.5">
              {morningPriorities.map((p, i) => {
                const done = prioritiesDone[i] ?? false;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const next = [...prioritiesDone];
                      next[i] = !done;
                      setPrioritiesDone(next);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                      done
                        ? "border-accent-green/40 bg-accent-green/5"
                        : "border-white/5 hover:border-white/15"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border grid place-items-center text-xs shrink-0 ${
                        done
                          ? "bg-accent-green border-accent-green text-ink-950"
                          : "border-ink-500"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span
                      className={`text-sm ${
                        done
                          ? "text-ink-100"
                          : "text-ink-300"
                      }`}
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
            <textarea
              value={win}
              onChange={(e) => setWin(e.target.value)}
              autoFocus
              rows={3}
              maxLength={280}
              placeholder="… I shipped Phase 1 of LifeOS."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 font-serif text-lg leading-snug focus:border-accent-green focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setWin((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">{win.length} / 280</span>
            </div>
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
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              autoFocus
              rows={3}
              maxLength={280}
              placeholder="… that I get distracted at the planning step, not the execution step."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-accent-sky focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setLesson((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">{lesson.length} / 280</span>
            </div>
          </Step>
        )}

        {stepIsTomorrow && (
          <Step
            heading="Tomorrow's seed."
            subhead="One thing to plant tonight that tomorrow-you will be glad you started."
          >
            <textarea
              value={tomorrowSeed}
              onChange={(e) => setTomorrowSeed(e.target.value)}
              autoFocus
              rows={2}
              maxLength={200}
              placeholder="… open the file before coffee."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-gold focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setTomorrowSeed((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">
                {tomorrowSeed.length} / 200
              </span>
            </div>
          </Step>
        )}

        {stepIsReframe && (
          <Step
            heading="A moment that hooked you today — what's the reframe?"
            subhead="The story I told myself vs the story that's actually true."
          >
            <textarea
              value={reframe}
              onChange={(e) => setReframe(e.target.value)}
              autoFocus
              rows={4}
              maxLength={280}
              placeholder="Story I told myself: … / Truer story: …"
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-accent-violet focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setReframe((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">{reframe.length} / 280</span>
            </div>
          </Step>
        )}

        {stepIsRelease && (
          <Step
            heading="What can you release before sleep?"
            subhead="A worry, a grudge, an open thread. Name it so it stops circling."
          >
            <textarea
              value={release}
              onChange={(e) => setRelease(e.target.value)}
              autoFocus
              rows={3}
              maxLength={280}
              placeholder="… the email I'm anxious about. It can wait until morning."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-accent-rose focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setRelease((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">{release.length} / 280</span>
            </div>
          </Step>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={back}
          disabled={step === 1 || submitting}
          className="text-sm text-ink-300 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue || submitting}
          className="px-5 py-2 rounded-lg bg-accent-rose/15 text-accent-rose border border-accent-rose/30 text-sm hover:bg-accent-rose/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          {submitting
            ? "Saving…"
            : step === totalSteps
              ? "Close the day →"
              : "Continue →"}
        </button>
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
      <h2 className="font-serif text-2xl text-ink-50 mb-1.5 leading-snug">
        {heading}
      </h2>
      <p className="text-sm text-ink-300 mb-6">{subhead}</p>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
      {children}
    </div>
  );
}
