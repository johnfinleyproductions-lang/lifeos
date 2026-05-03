"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LENSES } from "@/lib/journal/lenses";
import {
  type JournalMode,
  type DecisionCategory,
  type DecisionDoor,
  DECISION_CATEGORY_LABELS,
} from "@/lib/journal/schema";
import { VoiceButton } from "@/components/voice/VoiceButton";

const MODE_OPTIONS: {
  key: JournalMode;
  label: string;
  blurb: string;
  accent: string;
}[] = [
  {
    key: "stream",
    label: "Stream",
    blurb: "Free-form. Write to feel.",
    accent: "text-accent-violet",
  },
  {
    key: "framework",
    label: "Framework",
    blurb: "Pick a lens. Write to decide.",
    accent: "text-accent-sky",
  },
  {
    key: "conversation",
    label: "Conversation",
    blurb: "Talk to future-you.",
    accent: "text-accent-gold",
  },
];

const STREAM_PLACEHOLDER = "Dear universe…";
const CONVERSATION_PLACEHOLDER = `ME · today
…

FUTURE ME · age 80
…
`;

export function JournalEditor() {
  const router = useRouter();
  const [mode, setMode] = useState<JournalMode>("stream");
  const [body, setBody] = useState("");
  const [lensKey, setLensKey] = useState<string | null>(null);
  const [isDecision, setIsDecision] = useState(false);
  const [decisionSummary, setDecisionSummary] = useState("");
  const [decisionCategory, setDecisionCategory] = useState<
    DecisionCategory | ""
  >("");
  const [decisionDoor, setDecisionDoor] = useState<DecisionDoor | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const lens = lensKey ? LENSES.find((l) => l.key === lensKey) : null;

  function placeholder() {
    if (mode === "stream") return STREAM_PLACEHOLDER;
    if (mode === "conversation") return CONVERSATION_PLACEHOLDER;
    if (mode === "framework" && lens) return `Write under: ${lens.prompt}`;
    return "Pick a lens above…";
  }

  const canSave =
    body.trim().length > 0 &&
    (mode !== "framework" || Boolean(lensKey)) &&
    (!isDecision ||
      (decisionSummary.trim().length > 0 && decisionCategory && decisionDoor));

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/journal/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          body: body.trim(),
          frameworkLens: mode === "framework" ? lensKey : undefined,
          isDecision,
          decisionSummary: isDecision ? decisionSummary.trim() : undefined,
          decisionCategory: isDecision ? decisionCategory : undefined,
          decisionDoor: isDecision ? decisionDoor : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      // Reset for the next entry. Don't redirect — staying in the editor
      // matches journaling rhythm (often write a few in one sitting).
      setBody("");
      setIsDecision(false);
      setDecisionSummary("");
      setDecisionCategory("");
      setDecisionDoor("");
      if (mode !== "framework") setLensKey(null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            className={`flex-1 px-4 py-3 rounded-xl border text-left transition ${
              mode === opt.key
                ? "border-white/15 bg-white/[0.03]"
                : "border-white/5 hover:border-white/10"
            }`}
          >
            <div
              className={`text-xs uppercase tracking-[0.18em] mb-1 ${
                mode === opt.key ? opt.accent : "text-ink-400"
              }`}
            >
              {opt.label}
            </div>
            <div
              className={`text-sm ${
                mode === opt.key ? "text-ink-100" : "text-ink-300"
              }`}
            >
              {opt.blurb}
            </div>
          </button>
        ))}
      </div>

      {/* Lens picker — framework mode only */}
      {mode === "framework" && (
        <div className="card">
          <div className="card-glow" />
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
            Lens
          </div>
          <div className="flex flex-wrap gap-2">
            {LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLensKey(l.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  lensKey === l.key
                    ? "border-accent-sky bg-accent-sky/10 text-accent-sky"
                    : "border-white/10 text-ink-300 hover:border-white/30"
                }`}
              >
                {l.title}
              </button>
            ))}
          </div>
          {lens && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="font-serif text-lg text-ink-50 mb-1">
                {lens.prompt}
              </div>
              <div className="text-xs text-ink-300">{lens.description}</div>
            </div>
          )}
        </div>
      )}

      {/* The page */}
      <div className="card">
        <div className="card-glow" />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder()}
          rows={mode === "stream" ? 16 : 12}
          maxLength={20000}
          className={`w-full bg-transparent border-none focus:outline-none resize-none leading-relaxed ${
            mode === "stream"
              ? "font-serif text-lg text-ink-100"
              : mode === "conversation"
                ? "font-serif text-base text-ink-100"
                : "text-base text-ink-100"
          }`}
        />
        <div className="flex items-center justify-between text-[11px] text-ink-400 mt-3 pt-3 border-t border-white/5 gap-3">
          <span>
            {body.length} / 20000 ·{" "}
            {body.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="text-accent-green">✓ saved</span>
            )}
            <VoiceButton
              size="sm"
              onTranscript={(text) =>
                setBody((prev) => (prev ? `${prev} ${text}` : text))
              }
            />
          </div>
        </div>
      </div>

      {/* Decision tagging */}
      <div className="card">
        <div className="card-glow" />
        <button
          type="button"
          onClick={() => setIsDecision(!isDecision)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-1">
              Decision tag
            </div>
            <div className="text-sm text-ink-200">
              {isDecision
                ? "Tagged as a decision — fills the Decisions Log."
                : "Tap if this entry is documenting a decision."}
            </div>
          </div>
          <span
            className={`w-10 h-6 rounded-full relative transition shrink-0 ${
              isDecision ? "bg-accent-gold/30" : "bg-ink-700"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full transition ${
                isDecision
                  ? "left-[1.125rem] bg-accent-gold"
                  : "left-0.5 bg-ink-300"
              }`}
            />
          </span>
        </button>

        {isDecision && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            <input
              type="text"
              value={decisionSummary}
              onChange={(e) => setDecisionSummary(e.target.value)}
              placeholder="One-line summary of the decision"
              maxLength={280}
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
            />
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
                Category
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  Object.entries(DECISION_CATEGORY_LABELS) as [
                    DecisionCategory,
                    string,
                  ][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDecisionCategory(key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition ${
                      decisionCategory === key
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                        : "border-white/10 text-ink-300 hover:border-white/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
                Door type
              </div>
              <div className="flex gap-2">
                {(
                  [
                    {
                      key: "two_way" as DecisionDoor,
                      label: "Two-way",
                      sub: "reversible",
                    },
                    {
                      key: "one_way" as DecisionDoor,
                      label: "One-way",
                      sub: "permanent",
                    },
                  ]
                ).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDecisionDoor(d.key)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-left transition ${
                      decisionDoor === d.key
                        ? "border-accent-gold/50 bg-accent-gold/5"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-sm text-ink-100">{d.label}</div>
                    <div className="text-[10px] text-ink-400">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || submitting}
          className="px-6 py-2.5 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-sm hover:bg-accent-violet/25 disabled:opacity-30 transition"
        >
          {submitting ? "Saving…" : "Save entry"}
        </button>
      </div>
    </div>
  );
}
