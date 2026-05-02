"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Protocol,
  ACCENT_TEXT,
  ACCENT_BG,
  ACCENT_BORDER,
  ACCENT_BAR,
} from "@/lib/protocols/definitions";

/**
 * Generic runner for any protocol definition.
 *
 * Step 0 = intro screen with the protocol's description.
 * Steps 1..N = the prompts.
 * On the final step, "Save →" POSTs the payload to /api/protocols/[slug].
 *
 * No useState wrapping of server data here — local state is purely UI.
 */
export function ProtocolRunner({ protocol }: { protocol: Protocol }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const accentText = ACCENT_TEXT[protocol.accent];
  const accentBg = ACCENT_BG[protocol.accent];
  const accentBorder = ACCENT_BORDER[protocol.accent];
  const accentBar = ACCENT_BAR[protocol.accent];

  const totalSteps = protocol.prompts.length;

  function setResponse(id: string, value: string) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
      const res = await fetch(`/api/protocols/${protocol.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: responses, durationSeconds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      router.push("/identity");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSubmitting(false);
    }
  }

  function next() {
    if (step === totalSteps) {
      submit();
      return;
    }
    setStep(step + 1);
  }

  function back() {
    setStep(Math.max(0, step - 1));
  }

  // Intro
  if (step === 0) {
    return (
      <div className="card max-w-2xl mx-auto">
        <div className="card-glow" />
        <div
          className={`text-xs uppercase tracking-[0.18em] ${accentText} mb-2`}
        >
          {protocol.title}
        </div>
        <h1 className="font-serif text-3xl text-ink-50 mb-3 leading-snug">
          {protocol.subtitle}
        </h1>
        <p className="text-base text-ink-300 leading-relaxed mb-6">
          {protocol.description}
        </p>
        <div className="text-xs text-ink-400 mb-6">
          ~{protocol.estimatedMinutes} min · {totalSteps}{" "}
          {totalSteps === 1 ? "prompt" : "prompts"}
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`w-full py-3 rounded-lg ${accentBg} ${accentText} ${accentBorder} border text-sm hover:opacity-80 transition`}
        >
          Begin →
        </button>
      </div>
    );
  }

  const prompt = protocol.prompts[step - 1];
  const value = responses[prompt.id] ?? "";
  const canContinue =
    Boolean(prompt.optional) || value.trim().length > 0;

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="card-glow" />
      <div className="flex items-center justify-between mb-6">
        <div
          className={`text-xs uppercase tracking-[0.18em] ${accentText}`}
        >
          {protocol.title} · {step} / {totalSteps}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full transition ${
                i < step ? accentBar : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[260px]">
        <h2 className="font-serif text-2xl text-ink-50 mb-1.5 leading-snug">
          {prompt.label}
        </h2>
        {prompt.subhead && (
          <p className="text-sm text-ink-300 mb-5">{prompt.subhead}</p>
        )}

        {prompt.type === "text" ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setResponse(prompt.id, e.target.value)}
            autoFocus
            placeholder={prompt.placeholder}
            maxLength={prompt.maxLength ?? 200}
            className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-white/30 focus:outline-none"
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => setResponse(prompt.id, e.target.value)}
            autoFocus
            rows={6}
            placeholder={prompt.placeholder}
            maxLength={prompt.maxLength ?? 1000}
            className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-snug focus:border-white/30 focus:outline-none resize-none"
          />
        )}

        <div className="text-[11px] text-ink-400 mt-2 text-right tabular-nums">
          {value.length} /{" "}
          {prompt.maxLength ?? (prompt.type === "text" ? 200 : 1000)}
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={back}
          disabled={submitting}
          className="text-sm text-ink-300 hover:text-ink-100 disabled:opacity-30 transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue || submitting}
          className={`px-5 py-2 rounded-lg ${accentBg} ${accentText} ${accentBorder} border text-sm hover:opacity-80 disabled:opacity-30 transition`}
        >
          {submitting
            ? "Saving…"
            : step === totalSteps
              ? "Save →"
              : "Continue →"}
        </button>
      </div>
    </div>
  );
}
