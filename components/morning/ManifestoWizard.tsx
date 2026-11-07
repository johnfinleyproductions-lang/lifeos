"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { MorningManifesto, MorningRequest } from "@/lib/manifesto/schema";
import type { CarriedLine } from "@/lib/manifesto/carry";
import {
  DEPTH_CHOICES,
  type DepthChoice,
} from "@/lib/settings/ritual-depth";
import { VoiceButton } from "@/components/voice/VoiceButton";

function appendVoice(prev: string, text: string): string {
  return prev.trim().length > 0 ? `${prev} ${text}` : text;
}

/**
 * The cards, by depth. Quick is the floor that survives week three: a
 * read on the tank, the three (with whatever last night and the review
 * planted), and one line of thanks. Full adds the protected block and the
 * identity sentence, with the hardest question (who are you today?) moved
 * to the back of the deck so the easy ones have warmed the hand first.
 */
type StepId = "tank" | "three" | "protect" | "manifesto" | "gratitude";

const STEPS: Record<DepthChoice, StepId[]> = {
  quick: ["tank", "three", "gratitude"],
  full: ["tank", "three", "protect", "manifesto", "gratitude"],
};

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

/** One of the three slots. A carried slot remembers where its line came from. */
type Slot = {
  text: string;
  from: CarriedLine | null;
  struck: boolean;
};

function initialSlots(
  initial: MorningManifesto | null | undefined,
  carried: CarriedLine[],
): { slots: Slot[]; overflow: CarriedLine[] } {
  if (initial?.priorities && initial.priorities.length > 0) {
    const slots = [0, 1, 2].map((i) => ({
      text: initial.priorities[i] ?? "",
      from: null,
      struck: false,
    }));
    return { slots, overflow: [] };
  }
  const slots: Slot[] = [0, 1, 2].map((i) => {
    const line = carried[i];
    return line
      ? { text: line.text, from: line, struck: false }
      : { text: "", from: null, struck: false };
  });
  return { slots, overflow: carried.slice(3) };
}

type Props = {
  initial?: MorningManifesto | null;
  initialDepth?: DepthChoice;
  carried?: CarriedLine[];
};

export function ManifestoWizard({
  initial,
  initialDepth = "full",
  carried = [],
}: Props) {
  const router = useRouter();
  const [depth, setDepth] = useState<DepthChoice>(initialDepth);
  const steps = STEPS[depth];
  const [index, setIndex] = useState(0);
  const stepId = steps[Math.min(index, steps.length - 1)];
  const total = steps.length;
  const isLast = index === total - 1;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [energy, setEnergy] = useState<number>(initial?.energy ?? 3);
  const [mood, setMood] = useState<string>(initial?.mood ?? "");
  const [manifesto, setManifesto] = useState<string>(initial?.manifesto ?? "");
  const [seeded] = useState(() => initialSlots(initial, carried));
  const [slots, setSlots] = useState<Slot[]>(seeded.slots);
  const [overflow, setOverflow] = useState<CarriedLine[]>(seeded.overflow);
  const [protect, setProtect] = useState<string>(initial?.protect ?? "");
  const [gratitude, setGratitude] = useState<string>(initial?.gratitude ?? "");

  const priorities = slots
    .map((s) => s.text.trim())
    .filter((p) => p.length > 0);

  const canContinue =
    (stepId === "tank" && Boolean(mood.trim())) ||
    (stepId === "three" && priorities.length > 0) ||
    (stepId === "protect" && protect.trim().length >= 2) ||
    (stepId === "manifesto" && manifesto.trim().length >= 4) ||
    (stepId === "gratitude" && gratitude.trim().length >= 2);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Fields a Quick morning does not ask keep whatever an earlier Full
      // pass wrote, so revising at Quick never erases the manifesto.
      const payload: MorningRequest = {
        energy,
        mood: mood.trim(),
        manifesto: manifesto.trim(),
        priorities,
        protect: protect.trim(),
        gratitude: gratitude.trim(),
        depth,
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
    if (!canContinue || submitting) return;
    if (isLast) submit();
    else setIndex(index + 1);
  }
  function back() {
    setIndex(Math.max(0, index - 1));
  }

  /** Cmd/Ctrl+Enter in a textarea submits the card, like Enter in an input. */
  function submitOnModEnter(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  function setSlotText(i: number, text: string) {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, text } : s)));
  }
  function strikeSlot(i: number) {
    setSlots((prev) =>
      prev.map((s, j) => (j === i ? { ...s, text: "", struck: true } : s)),
    );
  }
  function restoreSlot(i: number) {
    setSlots((prev) =>
      prev.map((s, j) =>
        j === i && s.from ? { ...s, text: s.from.text, struck: false } : s,
      ),
    );
  }
  /** Place an overflow line into the first empty slot. */
  function placeOverflow(line: CarriedLine) {
    const i = slots.findIndex((s) => s.text.trim().length === 0);
    if (i === -1) return;
    setSlots((prev) =>
      prev.map((s, j) =>
        j === i ? { text: line.text, from: line, struck: false } : s,
      ),
    );
    setOverflow((prev) => prev.filter((l) => l !== line));
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
        className="wiz-card"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="wiz-step mb-0">
            Step {index + 1} of {total}
          </div>
          {stepId === "tank" && (
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
                  {c.label}
                  <span className="opacity-60 font-normal">, {c.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-[9px]" />

        {stepId === "tank" && (
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
                  className="chip min-h-9"
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
                aria-label="Mood, in your own word"
                className="inp"
              />
              <VoiceButton size="sm" onTranscript={(t) => setMood(t)} />
            </div>
            <p className="text-[11.5px] text-ink-400 mt-5 mb-0">
              {depth === "quick"
                ? "Quick: the tank, the three, one thanks. Remembered for tomorrow."
                : "Full: the tank, the three, what you protect, who you are, one thanks. Remembered for tomorrow."}
            </p>
          </Step>
        )}

        {stepId === "three" && (
          <Step
            heading="What are the three?"
            subhead={
              slots.some((s) => s.from)
                ? "What you planted is already on the sheet. Strike what no longer fits."
                : "In the order you will actually do them. Two is allowed."
            }
          >
            <div className="flex flex-col gap-3">
              {slots.map((s, i) => (
                <div key={i}>
                  {s.from && (
                    <div className="flex items-center gap-2 pl-[36px] mb-1 min-w-0">
                      <span
                        className={`text-[11.5px] min-w-0 ${
                          s.struck
                            ? "text-ink-400 line-through decoration-accent-spot decoration-2"
                            : "text-ink-300"
                        }`}
                        style={{ fontVariationSettings: "'wght' 640" }}
                      >
                        {s.from.from}
                        {s.struck ? `: ${s.from.text}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          s.struck ? restoreSlot(i) : strikeSlot(i)
                        }
                        className="text-[11.5px] text-ink-400 underline underline-offset-2 hover:text-ink-100 min-h-9 px-1 -my-2 shrink-0"
                      >
                        {s.struck ? "restore" : "strike"}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                      style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={s.text}
                      onChange={(e) => setSlotText(i, e.target.value)}
                      onKeyDown={(e) => {
                        // Enter walks down the list; on the last line it
                        // submits the card.
                        if (e.key === "Enter" && i < 2) {
                          e.preventDefault();
                          const form = e.currentTarget.form;
                          const inputs = form?.querySelectorAll<HTMLInputElement>(
                            "input[data-slot]",
                          );
                          inputs?.[i + 1]?.focus();
                        }
                      }}
                      data-slot={i}
                      autoFocus={i === 0}
                      maxLength={140}
                      placeholder={i === 2 ? "optional" : ""}
                      aria-label={`Priority ${i + 1}`}
                      className="inp"
                    />
                    <VoiceButton
                      size="sm"
                      onTranscript={(t) => setSlotText(i, appendVoice(s.text, t))}
                    />
                  </div>
                </div>
              ))}
            </div>
            {overflow.length > 0 && (
              <div className="mt-4 pt-3 border-t-[1.5px] border-ink-500">
                <div className="lbl mb-1.5">Also carried, if a line frees up</div>
                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                  {overflow.map((l) => (
                    <li key={`${l.source}-${l.text}`}>
                      <button
                        type="button"
                        onClick={() => placeOverflow(l)}
                        disabled={!slots.some((s) => !s.text.trim())}
                        className="text-left text-[13.5px] text-ink-300 hover:text-ink-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-9 py-1"
                      >
                        <span className="text-ink-400">{l.from}: </span>
                        {l.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Step>
        )}

        {stepId === "protect" && (
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
                aria-label="What you are protecting"
                className="inp"
              />
              <VoiceButton
                size="md"
                onTranscript={(t) => setProtect((p) => appendVoice(p, t))}
              />
            </div>
          </Step>
        )}

        {stepId === "manifesto" && (
          <Step
            heading="Who are you today?"
            subhead="Present tense. One sentence you would be glad to be held to. You already know the three; say who does them."
          >
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              onKeyDown={submitOnModEnter}
              autoFocus
              rows={4}
              maxLength={280}
              placeholder="I am someone who finishes what they start."
              aria-label="Who you are today"
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

        {stepId === "gratitude" && (
          <Step
            heading="One thing you are thankful for."
            subhead="Specific beats grand. Yesterday counts."
          >
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              onKeyDown={submitOnModEnter}
              autoFocus
              rows={3}
              maxLength={200}
              placeholder="that the dog forgave me for skipping the walk"
              aria-label="One thing you are thankful for"
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
            {submitting ? "Saving" : isLast ? "Set the day" : "Next"}
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
