"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileConfig } from "@/lib/profiles/config";

export function ProfilePicker({
  profiles,
  activeSlug,
  locked,
}: {
  profiles: ProfileConfig[];
  activeSlug: string | null;
  locked: boolean;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "That code is not right.");
      }
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is not right.");
    } finally {
      setUnlocking(false);
    }
  }

  async function pick(slug: string) {
    setPicking(slug);
    setError(null);
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Switch failed");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Switch failed");
      setPicking(null);
    }
  }

  /* The gate. No names, no count, nothing about who uses this device. */
  if (locked) {
    return (
      <div className="w-full max-w-md">
        <h1 className="t-h1">This device is locked</h1>
        <p className="text-[14.5px] text-ink-300 mt-2 max-w-[42ch]">
          Enter the household code once and this device stays unlocked for a
          month.
        </p>

        <form onSubmit={unlock} className="mt-7">
          <label htmlFor="household-code" className="lbl block mb-2">
            Household code
          </label>
          <div className="flex items-center gap-2">
            <input
              id="household-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="inp"
              placeholder="••••••"
            />
            <button
              type="submit"
              className="btn btn-spot shrink-0"
              disabled={unlocking || !code.trim()}
            >
              {unlocking ? "Checking" : "Unlock"}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert mt-5" role="alert">
            {error}
          </div>
        )}

        <p className="text-[12.5px] text-ink-400 mt-8 leading-relaxed max-w-[44ch]">
          Signing in by email link instead will also get you in, and does not
          need this code.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-8">
        <h1 className="t-h1">Who is using it?</h1>
        <p className="text-[14.5px] text-ink-300 mt-2">
          Each profile keeps its own log. Pick yours.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profiles.map((p) => {
          const active = activeSlug === p.slug;
          const inFlight = picking === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => pick(p.slug)}
              disabled={picking !== null}
              aria-current={active ? "true" : undefined}
              className={`sheet text-left py-6 ${
                active ? "sheet-hi shadow-mis" : "hover:bg-ink-700"
              } ${inFlight ? "opacity-60" : ""} disabled:cursor-wait`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-14 h-14 shrink-0 grid place-items-center text-[26px] border-[1.5px] ${p.accentClass}`}
                  style={{ fontVariationSettings: "'wdth' 90, 'wght' 800" }}
                >
                  {p.initial}
                </span>
                <span className="flex-1 min-w-0">
                  {/* Names only. Email addresses used to render here, to
                      anyone who loaded the page. */}
                  <span className="block t-h2">{p.name}</span>
                </span>
              </div>
              <div className="mt-4 pt-3 border-t-[1.5px] border-ink-500 flex items-center justify-between gap-3">
                <span className="lbl">
                  {inFlight
                    ? "Switching"
                    : active
                      ? "Signed in now"
                      : "Tap to switch"}
                </span>
                {active && <span className="tab tab-spot">Active</span>}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="alert mt-6" role="alert">
          {error}
        </div>
      )}

      <p className="text-[12.5px] text-ink-400 mt-8 leading-relaxed max-w-[48ch]">
        The first pick creates your account and workspace. Switch profiles any
        time from the rail.
      </p>
    </div>
  );
}
