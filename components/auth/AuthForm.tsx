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
      <div className="sheet sheet-hi shadow-mis max-w-md w-full">
        <div className="t-h1 mb-3">Check your email.</div>
        <p className="text-[14.5px] text-ink-300 leading-relaxed mb-3">
          A sign-in link is on its way to{" "}
          <span className="text-ink-100 font-serif">{email}</span>. Tap it from
          any device and you will land on Today.
        </p>
        <p className="text-[12.5px] text-ink-400 leading-relaxed">
          The link expires in five minutes. If it has not arrived in a minute,
          check spam, or come back here and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="btn btn-sm btn-ghost mt-6"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="sheet sheet-hi shadow-mis max-w-md w-full">
      <div
        className="text-[40px] leading-[0.92] tracking-[-0.035em] mb-2"
        style={{ fontVariationSettings: "'wdth' 88, 'wght' 800" }}
      >
        LifeOS
      </div>
      <p className="text-[14.5px] text-ink-300 mb-7">
        Enter your email and we will send a sign-in link. No password, nothing
        to remember.
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
        aria-label="Email"
        className="inp mb-4"
      />
      {error && (
        <div className="alert mb-4" role="alert">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="btn btn-spot w-full"
      >
        {submitting ? "Sending" : "Send sign-in link"}
      </button>
      <p className="text-[11.5px] text-ink-400 mt-5 leading-relaxed">
        First time here? You will be signed up automatically.
      </p>
    </form>
  );
}
