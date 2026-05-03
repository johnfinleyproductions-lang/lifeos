"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MorningManifesto } from "@/lib/manifesto/schema";
import { VoiceButton } from "@/components/voice/VoiceButton";

function appendVoice(prev: string, text: string): string {
  return prev.trim().length > 0 ? `${prev} ${text}` : text;
}

const TOTAL_STEPS = 5;

const ENERGY_LABELS = ["spent", "tired", "okay", "good", "lit"] as const;

const MOOD_OPTIONS = [
  "calm",
  "fired up",
  "anxious",
  "scattered",
  "grounded",
  "tender",
  "playful",
  "heavy",
];

type Props = {
  initial?: MorningManifesto | null;
};

export function ManifestoWizard({ initial }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [energy, setEnergy] = useState<number>(initial?.energy ?? 3);
  const [mood, setMood] = useState<string>(initial?.mood ?? "");
  const [manifesto, setManifesto] = useState<string>(initial?.manifesto ?? "");
  const [priorities, setPriorities] = useState<string[]>(
    initial?.priorities && initial.priorities.length > 0
      ? [...initial.priorities, "", "", ""].slice(0, 3)
      : ["", "", ""],
  );
  const [protect, setProtect] = useState<string>(initial?.protect ?? "");
  const [gratitude, setGratitude] = useState<string>(initial?.gratitude ?? "");

  const canContinue =
    (step === 1 && Boolean(mood.trim())) ||
    (step === 2 && manifesto.trim().length >= 4) ||
    (step === 3 && priorities.some((p) => p.trim().length > 0)) ||
    (step === 4 && protect.trim().length >= 2) ||
    (step === 5 && gratitude.trim().length >= 2);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: MorningManifesto = {
        energy,
        mood: mood.trim(),
        manifesto: manifesto.trim(),
        priorities: priorities
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
        protect: protect.trim(),
        gratitude: gratitude.trim(),
      };
      const res = await fetch("/api/morning", {
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
    if (step === TOTAL_STEPS) {
      submit();
    } else {
      setStep(step + 1);
    }
  }
  function back() {
    setStep(Math.max(1, step - 1));
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="card-glow" />

      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400">
          Morning manifesto · {step} / {TOTAL_STEPS}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full transition ${
                i < step ? "bg-accent-green" : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[280px]">
        {step === 1 && (
          <Step
            heading="How is your energy this morning?"
            subhead="Be honest. Naming it tells the day how to treat you."
          >
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergy(n)}
                  className={`py-3 rounded-lg border text-sm transition ${
                    energy === n
                      ? "border-accent-green bg-accent-green/10 text-accent-green"
                      : "border-white/5 text-ink-300 hover:border-white/15"
                  }`}
                >
                  <div className="font-serif text-xl">{n}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5">
                    {ENERGY_LABELS[n - 1]}
                  </div>
                </button>
              ))}
            </div>

            <Label>And the feeling underneath it?</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    mood === m
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
                value={
                  MOOD_OPTIONS.includes(mood) ? "" : mood
                }
                onChange={(e) => setMood(e.target.value)}
                placeholder="…or type your own"
                className="flex-1 bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-accent-violet focus:outline-none"
              />
              <VoiceButton
                size="sm"
                onTranscript={(t) => setMood(t)}
              />
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            heading="Today, the version of me showing up is…"
            subhead="One sentence. Identity-level. Who is the you that lives this day?"
          >
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              autoFocus
              rows={4}
              maxLength={280}
              placeholder="… someone who finishes what they start."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 font-serif text-xl leading-snug focus:border-accent-green focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setManifesto((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">
                {manifesto.length} / 280
              </span>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            heading="The three things that matter today."
            subhead="If only these three got done, the day still counts."
          >
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ink-700 grid place-items-center text-xs text-ink-300 shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={priorities[i]}
                    onChange={(e) => {
                      const next = [...priorities];
                      next[i] = e.target.value;
                      setPriorities(next);
                    }}
                    maxLength={140}
                    placeholder={
                      i === 0
                        ? "The one that matters most"
                        : "Another priority"
                    }
                    className="flex-1 bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-accent-green focus:outline-none"
                  />
                  <VoiceButton
                    size="sm"
                    onTranscript={(t) => {
                      const next = [...priorities];
                      next[i] = appendVoice(next[i], t);
                      setPriorities(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step
            heading="If today goes sideways, the one thing you must protect is…"
            subhead="Could be a person, a window of focus, your morning routine — anything."
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={protect}
                onChange={(e) => setProtect(e.target.value)}
                autoFocus
                maxLength={200}
                placeholder="… the 90 minutes after lunch."
                className="flex-1 bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-rose focus:outline-none"
              />
              <VoiceButton
                size="md"
                onTranscript={(t) =>
                  setProtect((prev) => appendVoice(prev, t))
                }
              />
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step
            heading="One thing you're grateful for."
            subhead="Specific beats grand. Yesterday counts."
          >
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              autoFocus
              rows={3}
              maxLength={200}
              placeholder="… that the dog forgave me for skipping the walk."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-gold focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-ink-400 mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) =>
                  setGratitude((prev) => appendVoice(prev, t))
                }
              />
              <span className="tabular-nums">
                {gratitude.length} / 200
              </span>
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
          className="px-5 py-2 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          {submitting
            ? "Saving…"
            : step === TOTAL_STEPS
              ? "Set the day →"
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
