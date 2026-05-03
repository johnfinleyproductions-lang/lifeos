"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await authClient.signIn.magicLink({
        email: email.trim().toLowerCase(),
        callbackURL: "/",
      });
      if (result?.error) {
        throw new Error(result.error.message ?? "Failed to send link");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send link");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="card max-w-md w-full text-center">
        <div className="card-glow" />
        <div className="font-serif text-3xl text-ink-50 mb-3">
          Check your email.
        </div>
        <p className="text-sm text-ink-300 leading-relaxed mb-4">
          A sign-in link is on its way to{" "}
          <span className="text-ink-100">{email}</span>. Tap it from any
          device — phone, laptop, anywhere — and you&apos;ll land on Today.
        </p>
        <p className="text-xs text-ink-400 leading-relaxed">
          The link expires in 5 minutes. If you don&apos;t see the email in
          a minute, check spam — or come back here and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="mt-6 text-xs text-ink-400 hover:text-ink-100 transition"
        >
          Use a different email →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="card max-w-md w-full">
      <div className="card-glow" />
      <div className="font-serif text-4xl text-ink-50 mb-2 leading-none">
        LifeOS
      </div>
      <p className="text-sm text-ink-300 mb-8">
        Enter your email. We&apos;ll send you a sign-in link — no password,
        nothing to remember.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoFocus
        required
        autoComplete="email"
        inputMode="email"
        className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-violet/40 focus:outline-none mb-4"
      />
      {error && (
        <div className="text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="w-full py-3 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-sm hover:bg-accent-violet/25 disabled:opacity-30 transition"
      >
        {submitting ? "Sending…" : "Send sign-in link"}
      </button>
      <p className="text-[11px] text-ink-400 mt-6 text-center leading-relaxed">
        First time here? You&apos;ll be signed up automatically.
      </p>
    </form>
  );
}
