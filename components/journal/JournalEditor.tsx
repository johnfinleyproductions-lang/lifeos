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
}[] = [
  { key: "stream", label: "Stream", blurb: "Free-form. Write to feel." },
  {
    key: "framework",
    label: "Framework",
    blurb: "Pick a lens. Write to decide.",
  },
  { key: "conversation", label: "Conversation", blurb: "Talk to future you." },
];

const STREAM_PLACEHOLDER = "Dear universe,";
const CONVERSATION_PLACEHOLDER = `Me, today:

Me, at eighty:
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
    return "Pick a lens above.";
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

  const words = body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Mode: three hard keys, the pressed one filled. */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Mode">
        {MODE_OPTIONS.map((opt) => {
          const on = mode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              aria-pressed={on}
              className={`text-left px-3.5 py-3 border-[1.5px] border-ink-50 ${
                on
                  ? "bg-ink-50 text-ink-900"
                  : "bg-transparent hover:bg-ink-700"
              }`}
            >
              <span
                className="block text-[14px] leading-tight"
                style={{ fontVariationSettings: "'wdth' 96, 'wght' 720" }}
              >
                {opt.label}
              </span>
              <span
                className={`block text-[12px] mt-1 leading-snug ${
                  on ? "opacity-70" : "text-ink-300"
                }`}
              >
                {opt.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lens picker, framework mode only */}
      {mode === "framework" && (
        <section>
          <div className="tab-row">
            <span className="tab">Lens</span>
            <span className="fill" />
          </div>
          <div className="sheet">
            <div className="flex flex-wrap gap-1.5">
              {LENSES.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLensKey(l.key)}
                  aria-pressed={lensKey === l.key}
                  className="chip"
                >
                  {l.title}
                </button>
              ))}
            </div>
            {lens && (
              <div className="mt-4 pt-4 border-t-[1.5px] border-ink-500">
                <div className="t-h2">{lens.prompt}</div>
                <div className="text-[13px] text-ink-300 mt-1.5">
                  {lens.description}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* The page. The user's writing, so the serif, with the sheet as the
          frame and the misregistration as the focus state. */}
      <div className="sheet sheet-hi focus-within:shadow-mis">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder()}
          rows={mode === "stream" ? 16 : 12}
          maxLength={20000}
          aria-label="Entry"
          className={`w-full bg-transparent border-0 p-0 outline-none resize-none font-serif text-ink-100 placeholder:text-ink-400 placeholder:italic ${
            mode === "framework"
              ? "text-[17px] leading-[1.6]"
              : "text-[19px] leading-[1.6]"
          }`}
        />
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t-[1.5px] border-ink-500">
          <span className="wiz-count">
            {body.length}/20000, {words} {words === 1 ? "word" : "words"}
          </span>
          <div className="flex items-center gap-3">
            {savedFlash && (
              <span
                className="text-[12.5px] text-accent-spot"
                style={{ fontVariationSettings: "'wght' 700" }}
                role="status"
              >
                Saved
              </span>
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
      <div className="sheet">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="ck"
            checked={isDecision}
            onChange={() => setIsDecision(!isDecision)}
          />
          <span className="flex-1 min-w-0">
            <span
              className="block text-[15px]"
              style={{ fontVariationSettings: "'wght' 680" }}
            >
              This entry records a decision
            </span>
            <span className="block text-[12.5px] text-ink-300 mt-0.5">
              {isDecision
                ? "Tagged. It will appear in the decisions log."
                : "Strike it and the entry files into the decisions log."}
            </span>
          </span>
        </label>

        {isDecision && (
          <div className="mt-4 pt-4 border-t-[1.5px] border-ink-500 space-y-4">
            <input
              type="text"
              value={decisionSummary}
              onChange={(e) => setDecisionSummary(e.target.value)}
              placeholder="One line: what was decided"
              maxLength={280}
              className="inp"
            />
            <div>
              <div className="lbl mb-2">Category</div>
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
                    aria-pressed={decisionCategory === key}
                    className="chip"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="lbl mb-2">Door</div>
              <div className="grid grid-cols-2 gap-2">
                {[
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
                ].map((d) => {
                  const on = decisionDoor === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDecisionDoor(d.key)}
                      aria-pressed={on}
                      className={`text-left px-3.5 py-2.5 border-[1.5px] border-ink-50 ${
                        on
                          ? "bg-ink-50 text-ink-900"
                          : "bg-transparent hover:bg-ink-700"
                      }`}
                    >
                      <span
                        className="block text-[14px]"
                        style={{ fontVariationSettings: "'wght' 700" }}
                      >
                        {d.label}
                      </span>
                      <span
                        className={`block text-[11.5px] ${
                          on ? "opacity-70" : "text-ink-400"
                        }`}
                      >
                        {d.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || submitting}
          className="btn btn-spot"
        >
          {submitting ? "Saving" : "Save entry"}
        </button>
      </div>
    </div>
  );
}
