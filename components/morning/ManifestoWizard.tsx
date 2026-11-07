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
        priorities: priorities.map((p) => p.trim()).filter((p) => p.length > 0),
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
    if (step === TOTAL_STEPS) submit();
    else setStep(step + 1);
  }
  function back() {
    setStep(Math.max(1, step - 1));
  }

  return (
    <div className="wiz">
      <div className="wiz-bar" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <i
            key={i}
            className={
              i + 1 < step ? "on" : i + 1 === step ? "cur" : undefined
            }
          />
        ))}
      </div>

      <div className="wiz-card">
        <div className="wiz-step">
          Step {step} of {TOTAL_STEPS}
        </div>

        {step === 1 && (
          <Step
            heading="How much is in the tank?"
            subhead="A gut read, not an audit. Naming it tells the day how to treat you."
          >
            <div className="pick" role="group" aria-label="Energy">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergy(n)}
                  aria-pressed={energy === n}
                >
                  <span
                    className="block text-lg"
                    style={{ fontVariationSettings: "'wdth' 100, 'wght' 700" }}
                  >
                    {n}
                  </span>
                  <span className="block text-[10.5px] mt-0.5 opacity-70">
                    {ENERGY_LABELS[n - 1]}
                  </span>
                </button>
              ))}
            </div>

            <p className="wiz-h mt-6 mb-3">And the feeling underneath it?</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  aria-pressed={mood === m}
                  className={`border-[1.5px] border-ink-50 text-xs px-2.5 py-1.5 ${
                    mood === m
                      ? "bg-ink-50 text-ink-900"
                      : "bg-transparent hover:bg-ink-700"
                  }`}
                  style={{ fontVariationSettings: "'wght' 620" }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={MOOD_OPTIONS.includes(mood) ? "" : mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="or type your own"
                className="inp"
              />
              <VoiceButton size="sm" onTranscript={(t) => setMood(t)} />
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            heading="Who are you today?"
            subhead="Present tense. One sentence you would be glad to be held to."
          >
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              autoFocus
              rows={4}
              maxLength={280}
              placeholder="I am someone who finishes what they start."
              className="ta"
            />
            <div className="flex items-center justify-between mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) => setManifesto((p) => appendVoice(p, t))}
              />
              <span
                className={`wiz-count ${manifesto.length > 258 ? "over" : ""}`}
              >
                {manifesto.length}/280
              </span>
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            heading="What are the three?"
            subhead="In the order you will actually do them. Two is allowed."
          >
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                    style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={priorities[i]}
                    onChange={(e) => {
                      const next = [...priorities];
                      next[i] = e.target.value;
                      setPriorities(next);
                    }}
                    maxLength={140}
                    placeholder={i === 2 ? "optional" : ""}
                    className="inp"
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
            heading="What are you protecting today?"
            subhead="The block, the person, or the boundary. If the day goes sideways, this is what survives."
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={protect}
                onChange={(e) => setProtect(e.target.value)}
                autoFocus
                maxLength={200}
                placeholder="the ninety minutes after lunch"
                className="inp"
              />
              <VoiceButton
                size="md"
                onTranscript={(t) => setProtect((p) => appendVoice(p, t))}
              />
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step
            heading="One thing you are thankful for."
            subhead="Specific beats grand. Yesterday counts."
          >
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              autoFocus
              rows={3}
              maxLength={200}
              placeholder="that the dog forgave me for skipping the walk"
              className="ta"
            />
            <div className="flex items-center justify-between mt-2">
              <VoiceButton
                size="sm"
                onTranscript={(t) => setGratitude((p) => appendVoice(p, t))}
              />
              <span
                className={`wiz-count ${gratitude.length > 184 ? "over" : ""}`}
              >
                {gratitude.length}/200
              </span>
            </div>
          </Step>
        )}

        {error && (
          <div
            className="mt-4 px-3 py-2.5 text-sm border-[1.5px]"
            style={{ borderColor: "var(--spot)", color: "var(--spot)" }}
            role="alert"
          >
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
            className={`btn btn-next ${step === TOTAL_STEPS ? "btn-spot" : ""}`}
          >
            {submitting
              ? "Saving"
              : step === TOTAL_STEPS
                ? "Set the day"
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
