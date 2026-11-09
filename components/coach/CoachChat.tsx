"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/coach/schema";
import { VoiceButton } from "@/components/voice/VoiceButton";
import {
  isSpeechSynthesisSupported,
  speak,
  stopSpeaking,
} from "@/lib/voice/speech";

const SUGGESTED_OPENERS = [
  "How's my week looking so far?",
  "What should I focus on today?",
  "Talk me through where I am on my quests.",
  "I'm stuck on something. Can I think out loud?",
  "What patterns do you see in my last 7 days?",
];

const MODEL_KEY = "lifeos-coach-model";

type ModelState =
  | { status: "loading" }
  | { status: "ready"; models: string[] }
  | { status: "down"; reason: string };

export function CoachChat({
  defaultModel,
  host,
}: {
  /** The model the server uses when nobody has picked. */
  defaultModel: string;
  /** The model server's address, for the message when it is not answering. */
  host: string;
}) {
  const [model, setModel] = useState(defaultModel);
  const [modelState, setModelState] = useState<ModelState>({ status: "loading" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speakResponses, setSpeakResponses] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>("");

  /** Ask the server which models the coach can use, and settle on one. */
  async function loadModels() {
    setModelState({ status: "loading" });
    try {
      const res = await fetch("/api/coach/models", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.reachable) {
        setModelState({
          status: "down",
          reason: data.reason ?? data.error ?? "The model server is not answering.",
        });
        return;
      }
      const models: string[] = data.models ?? [];
      if (models.length === 0) {
        setModelState({
          status: "down",
          reason: `${host} is running but has no chat models yet.`,
        });
        return;
      }
      // Keep the last pick if it is still there, then the default, then
      // whatever the server lists first.
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(MODEL_KEY);
      } catch {
        saved = null;
      }
      const pick =
        (saved && models.includes(saved) && saved) ||
        (models.includes(defaultModel) && defaultModel) ||
        models.find((name) => name.startsWith(`${defaultModel}:`)) ||
        models[0];
      setModel(pick);
      setModelState({ status: "ready", models });
    } catch {
      setModelState({ status: "down", reason: "Could not ask for the list of models." });
    }
  }

  function chooseModel(next: string) {
    setModel(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      // Private windows may refuse storage. The pick still holds for this visit.
    }
  }

  useEffect(() => {
    loadModels();
    // Once, when the page opens. Refresh asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTtsSupported(isSpeechSynthesisSupported());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // When a streaming response finishes, optionally speak it.
  useEffect(() => {
    if (!speakResponses || streaming) return;
    const last = messages[messages.length - 1];
    if (
      last?.role === "assistant" &&
      last.content.trim().length > 0 &&
      last.content !== lastSpokenRef.current
    ) {
      lastSpokenRef.current = last.content;
      speak(last.content);
    }
  }, [streaming, messages, speakResponses]);

  async function send(content: string) {
    if (!content.trim() || streaming) return;
    stopSpeaking();
    const userMsg: ChatMessage = { role: "user", content: content.trim() };
    // Filter out any prior empty-assistant placeholders before sending —
    // those are UI state only, the server's zod schema requires non-empty
    // content on every message.
    const cleanHistory = messages.filter((m) => m.content.trim().length > 0);
    const nextMessages = [...cleanHistory, userMsg];
    setMessages([...nextMessages]);
    setInput("");
    setError(null);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, model }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Coach error (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (json === "[DONE]" || !json) continue;
          try {
            const evt = JSON.parse(json);
            // OpenAI-compat: choices[0].delta.content
            // Some servers also expose .delta.reasoning_content (Qwen-style
            // thinking tokens) which we collect separately so the visible
            // answer doesn't include the model's internal reasoning.
            const piece: string | undefined = evt.choices?.[0]?.delta?.content;
            if (typeof piece === "string" && piece.length > 0) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + piece,
                  };
                }
                return updated;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stream");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  function appendVoice(text: string) {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 -mr-2 mb-4">
        {messages.length === 0 ? (
          <div className="sheet">
            <div className="t-h2 mb-2">Where do you want to start?</div>
            <p className="text-[14.5px] text-ink-300 mb-5 max-w-[60ch]">
              The coach can see your check-ins, quests, habits, focus, balance
              and confidence file. Never your journal; that stays private.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_OPENERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="chip min-h-9 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <Message key={i} role={m.role} content={m.content} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="alert mb-2" role="alert">
          {error}
        </div>
      )}

      {/* Which model answers, and whether it answers aloud */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor="coach-model" className="shrink-0 text-[12.5px] font-semibold text-ink-300">
            Model
          </label>
          {modelState.status === "ready" ? (
            <select
              id="coach-model"
              className="pick"
              value={model}
              disabled={streaming}
              onChange={(e) => chooseModel(e.target.value)}
            >
              {modelState.models.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <span id="coach-model" className="text-[13px] text-ink-400 truncate">
              {modelState.status === "loading"
                ? "Asking the model server what it has."
                : modelState.reason}
            </span>
          )}
          {modelState.status !== "loading" && (
            <button
              type="button"
              className="chip min-h-9"
              onClick={loadModels}
              title={`Ask ${host} again`}
            >
              Refresh
            </button>
          )}
        </div>
        {ttsSupported && (
          <button
            type="button"
            onClick={() => {
              if (speakResponses) stopSpeaking();
              setSpeakResponses(!speakResponses);
            }}
            aria-pressed={speakResponses}
            className="chip min-h-9"
          >
            {speakResponses ? "Speaking replies aloud" : "Read replies aloud"}
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sheet sheet-hi flex items-end gap-3 focus-within:shadow-mis-sm"
      >
        <VoiceButton
          onTranscript={appendVoice}
          disabled={streaming}
          size="md"
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder={
            streaming ? "The coach is thinking" : "Ask anything, or tap the mic"
          }
          disabled={streaming}
          aria-label="Message"
          className="flex-1 bg-transparent border-0 p-0 outline-none resize-none font-serif text-[17px] leading-[1.5] text-ink-100 placeholder:text-ink-400 placeholder:italic disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn shrink-0"
        >
          {streaming ? "Sending" : "Send"}
        </button>
      </form>
    </div>
  );
}

/**
 * Strip <think>...</think> reasoning blocks emitted by Qwen-style models
 * before the visible answer. If the closing tag hasn't streamed in yet,
 * we hide the in-progress thinking too — once the close tag arrives, the
 * visible answer below it appears.
 */
function stripThinking(text: string): string {
  // Remove complete <think>...</think> blocks
  let out = text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "");
  // If the model is mid-think (open tag, no close yet), hide the partial
  if (/<think>/i.test(out)) {
    out = out.replace(/<think>[\s\S]*$/i, "");
  }
  return out;
}

function Message({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  // The user's own words sit in the serif on a raised sheet; the coach
  // answers in the display face under a filled tab.
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] min-w-0 sheet sheet-hi px-4 py-3 font-serif text-[16px] leading-[1.5] whitespace-pre-wrap [overflow-wrap:anywhere]">
          {content}
        </div>
      </div>
    );
  }
  const visible = stripThinking(content).trim();
  const isThinking = !visible && /<think>/i.test(content);
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] min-w-0">
        <div className="tab-row mb-2">
          <span className="tab">Coach</span>
        </div>
        {/* pre-wrap keeps the model's line breaks; overflow-wrap lets a URL
            or a long token break rather than push the bubble off the phone */}
        <div className="text-[15.5px] whitespace-pre-wrap leading-[1.55] [overflow-wrap:anywhere]">
          {visible || (
            <span className="text-ink-400 italic">
              {isThinking ? "Reasoning through it" : "Thinking"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
