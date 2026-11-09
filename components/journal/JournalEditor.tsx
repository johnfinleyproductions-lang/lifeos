"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LENSES, getLens } from "@/lib/journal/lenses";
import {
  type JournalMode,
  type DecisionCategory,
  type DecisionDoor,
  DECISION_CATEGORY_LABELS,
} from "@/lib/journal/schema";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { offlineFetch } from "@/lib/offline/outbox";

/**
 * Two ways to write. Framework is the default: one lens already chosen,
 * its question printed above the page, so there is never a blank sheet
 * to stare down. Stream is one tap away and keeps the question as a
 * placeholder; "talk to future you" is a chip inside Stream, since it was
 * only ever a Stream entry with a template placeholder.
 */
type Surface = "framework" | "stream";

const SURFACES: { key: Surface; label: string; blurb: string }[] = [
  {
    key: "framework",
    label: "Framework",
    blurb: "The day's lens. Write to decide.",
  },
  { key: "stream", label: "Stream", blurb: "Free-form. Write to feel." },
];

const CONVERSATION_PLACEHOLDER = `Me, today:

Me, at eighty:
`;

const MODE_LABEL: Record<string, string> = {
  stream: "Stream",
  framework: "Framework",
  conversation: "Conversation",
};

export type TodayEntry = {
  id: string;
  mode: string;
  body: string;
  frameworkLens: string | null;
  isDecision: boolean;
  decisionSummary: string | null;
  decisionDoor: string | null;
  /** Already formatted in the household zone, e.g. "7:42 AM". */
  time: string;
};

type Props = {
  dailyLensKey: string;
  todayEntries?: TodayEntry[];
};

export function JournalEditor({ dailyLensKey, todayEntries = [] }: Props) {
  const router = useRouter();
  const dailyLens = getLens(dailyLensKey) ?? LENSES[0];

  const [surface, setSurface] = useState<Surface>("framework");
  const [conversation, setConversation] = useState(false);
  const [lensKey, setLensKey] = useState<string>(dailyLens.key);
  const [body, setBody] = useState("");
  const [isDecision, setIsDecision] = useState(false);
  const [decisionSummary, setDecisionSummary] = useState("");
  const [decisionCategory, setDecisionCategory] = useState<
    DecisionCategory | ""
  >("");
  const [decisionDoor, setDecisionDoor] = useState<DecisionDoor | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<"saved" | "kept" | null>(null);

  const lens = getLens(lensKey) ?? dailyLens;
  const mode: JournalMode =
    surface === "framework"
      ? "framework"
      : conversation
        ? "conversation"
        : "stream";

  function placeholder() {
    if (mode === "conversation") return CONVERSATION_PLACEHOLDER;
    if (mode === "stream") return dailyLens.prompt;
    return "Write under the question.";
  }

  const canSave =
    body.trim().length > 0 &&
    (!isDecision ||
      (decisionSummary.trim().length > 0 && decisionCategory && decisionDoor));

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      const text = body.trim();
      const words = text.split(/\s+/);
      const res = await offlineFetch(
        "/api/journal/entries",
        {
          mode,
          body: text,
          ...(mode === "framework" ? { frameworkLens: lens.key } : {}),
          isDecision,
          ...(isDecision
            ? {
                decisionSummary: decisionSummary.trim(),
                decisionCategory,
                decisionDoor,
              }
            : {}),
        },
        {
          kind: "journal",
          label: `Journal: ${words.slice(0, 7).join(" ")}${words.length > 7 ? "…" : ""}`,
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save");
      }
      // Clear for the next entry. The saved words reappear under the page
      // once the server re-renders today's list.
      setBody("");
      setIsDecision(false);
      setDecisionSummary("");
      setDecisionCategory("");
      setDecisionDoor("");
      // With no connection the entry is kept on this device and sent later;
      // the mark in the corner counts what is waiting.
      setSavedFlash(data.queued ? "kept" : "saved");
      setTimeout(() => setSavedFlash(null), data.queued ? 6000 : 2500);
      if (!data.queued) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const words = body.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Surface: two hard keys, the pressed one filled. */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mode">
        {SURFACES.map((opt) => {
          const on = surface === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSurface(opt.key)}
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

      {/* Lens picker. The day's lens is pre-pressed; any other is a tap away. */}
      {surface === "framework" && (
        <section>
          <div className="tab-row">
            <span className="tab">Lens</span>
            <span className="fill" />
            <span className="text-[11.5px] text-ink-400">
              {lens.key === dailyLens.key
                ? "today's lens"
                : `today's is ${dailyLens.title}`}
            </span>
          </div>
          <div className="sheet">
            <div className="flex flex-wrap gap-1.5">
              {LENSES.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLensKey(l.key)}
                  aria-pressed={lensKey === l.key}
                  className="chip min-h-9"
                >
                  {l.title}
                  {l.key === dailyLens.key && (
                    <span
                      aria-hidden="true"
                      className="inline-block w-[7px] h-[7px] bg-accent-spot"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stream's one chip: the letter to future you. */}
      {surface === "stream" && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setConversation((c) => !c)}
            aria-pressed={conversation}
            className="chip min-h-9"
          >
            Talk to future you
          </button>
          <span className="text-[12px] text-ink-400">
            {conversation
              ? "Two voices on the page, taking turns."
              : "Or just write. The question is there if you want it."}
          </span>
        </div>
      )}

      {/* The page. The user's writing, so the serif, with the sheet as the
          frame and the misregistration as the focus state. The question is
          printed above the writing, part of the page, not a placeholder. */}
      <div className="sheet sheet-hi focus-within:shadow-mis">
        {surface === "framework" && (
          <div className="mb-4 pb-4 border-b-[1.5px] border-ink-500">
            <label
              htmlFor="journal-page"
              className="block font-serif text-[clamp(20px,2.6vw,26px)] leading-[1.25] tracking-[-0.01em] text-balance"
            >
              {lens.prompt}
            </label>
            <div className="text-[13px] text-ink-300 mt-1.5">
              {lens.description}
            </div>
          </div>
        )}
        <textarea
          id="journal-page"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder()}
          rows={surface === "stream" ? 16 : 12}
          maxLength={20000}
          aria-label={surface === "framework" ? undefined : "Entry"}
          className={`w-full bg-transparent border-0 p-0 outline-none resize-none font-serif text-ink-100 placeholder:text-ink-400 placeholder:italic ${
            surface === "framework"
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
                {savedFlash === "kept"
                  ? "Kept on this device, sends when you are back"
                  : "Saved, below"}
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
        <label className="flex items-center gap-3 cursor-pointer min-h-9">
          <input
            type="checkbox"
            className="ck w-9 h-9 [flex:0_0_36px] checked:after:left-[12px] checked:after:top-[15px] checked:after:w-[14px] checked:after:h-[7px] checked:after:border-b-[3px] checked:after:border-l-[3px]"
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
              aria-label="What was decided"
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
                    className="chip min-h-9"
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

      {/* Today, under the page: what has been written so far. */}
      <section className="pt-2">
        <div className="tab-row">
          <span className="tab">Today</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400 tabular-nums">
            {todayEntries.length === 0
              ? "nothing yet"
              : `${todayEntries.length} ${todayEntries.length === 1 ? "entry" : "entries"}`}
          </span>
        </div>
        {todayEntries.length === 0 ? (
          <p className="text-[13.5px] text-ink-400 italic m-0">
            What you save stays here for the rest of the day, then files into
            Past entries.
          </p>
        ) : (
          <div className="space-y-3">
            {todayEntries.map((e) => {
              const l = e.frameworkLens ? getLens(e.frameworkLens) : null;
              const meta = [
                MODE_LABEL[e.mode] ?? e.mode,
                l?.title,
                e.isDecision ? "decision" : null,
              ].filter(Boolean);
              return (
                <article key={e.id} className="sheet">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <div className="lbl">{meta.join(", ")}</div>
                    <span className="text-[11.5px] text-ink-400 tabular-nums shrink-0">
                      {e.time}
                    </span>
                  </div>
                  {l && <div className="t-h2 mb-2">{l.prompt}</div>}
                  <div className="t-read whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {e.body}
                  </div>
                  {e.isDecision && e.decisionSummary && (
                    <div className="mt-4 pt-3 border-t-[1.5px] border-ink-500 flex gap-3.5">
                      <span
                        className="shrink-0 w-[84px] text-[11.5px] text-ink-400 pt-[3px]"
                        style={{
                          fontVariationSettings: "'wdth' 100, 'wght' 680",
                        }}
                      >
                        Decided
                      </span>
                      <span className="flex-1 font-serif text-base leading-[1.5]">
                        {e.decisionSummary}
                        {e.decisionDoor && (
                          <span className="text-ink-400 text-[13px] font-sans ml-2">
                            {e.decisionDoor.replace("_", "-")} door
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
