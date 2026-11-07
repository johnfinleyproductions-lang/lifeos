"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Protocol } from "@/lib/protocols/definitions";

/**
 * The runner for a protocol.
 *
 * Step 0 is the intro sheet with the protocol's description; steps
 * 1..N are the prompts; the last step saves by POSTing the payload to
 * /api/protocols/[slug]. Local state is purely UI.
 *
 * Two things differ from the shared runner in components/protocols.
 * The page above supplies the h1 (the protocol's name in the page
 * stamp), so the intro sets its subtitle as an h2 rather than a second
 * h1. And Begin is an ink button: starting an exercise is not "live,
 * today, now", so it does not take the spot. Save at the end keeps the
 * spot, since it is the moment the run is committed to the record, the
 * same as the morning and evening wizards.
 */
export function Runner({ protocol }: { protocol: Protocol }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

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

  if (step === 0) {
    return (
      <div className="wiz">
        <div className="wiz-card">
          <div className="wiz-step">{protocol.title}</div>
          <h2 className="t-h2 text-[clamp(21px,2.6vw,27px)] leading-[1.1] mb-3">
            {protocol.subtitle}
          </h2>
          <p className="text-[15px] text-ink-300 leading-[1.5] mb-6">
            {protocol.description}
          </p>
          <div className="wiz-foot">
            <span className="wiz-count">
              About {protocol.estimatedMinutes} min, {totalSteps}{" "}
              {totalSteps === 1 ? "prompt" : "prompts"}
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-next"
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const prompt = protocol.prompts[step - 1];
  const value = responses[prompt.id] ?? "";
  const canContinue = Boolean(prompt.optional) || value.trim().length > 0;
  const max = prompt.maxLength ?? (prompt.type === "text" ? 200 : 1000);

  return (
    <div className="wiz">
      <div className="wiz-bar" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <i
            key={i}
            className={i + 1 < step ? "on" : i + 1 === step ? "cur" : undefined}
          />
        ))}
      </div>

      <div className="wiz-card">
        <div className="wiz-step">
          {protocol.title}, step {step} of {totalSteps}
        </div>

        <h2 className="wiz-q">{prompt.label}</h2>
        {prompt.subhead && <p className="wiz-h">{prompt.subhead}</p>}

        {prompt.type === "text" ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setResponse(prompt.id, e.target.value)}
            autoFocus
            placeholder={prompt.placeholder}
            maxLength={max}
            className="inp"
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => setResponse(prompt.id, e.target.value)}
            autoFocus
            rows={6}
            placeholder={prompt.placeholder}
            maxLength={max}
            className="ta"
          />
        )}

        <div className="flex items-center justify-end mt-2">
          <span
            className={`wiz-count ${value.length > max - Math.round(max * 0.08) ? "over" : ""}`}
          >
            {value.length}/{max}
          </span>
        </div>

        {error && (
          <div className="alert mt-4" role="alert">
            {error} Nothing was lost; press it again.
          </div>
        )}

        <div className="wiz-foot">
          <button
            type="button"
            onClick={back}
            disabled={submitting}
            className="btn btn-ghost"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue || submitting}
            className={`btn btn-next ${step === totalSteps ? "btn-spot" : ""}`}
          >
            {submitting ? "Saving" : step === totalSteps ? "Save" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
