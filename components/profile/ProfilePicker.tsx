"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileConfig } from "@/lib/profiles/config";

export function ProfilePicker({
  profiles,
  activeSlug,
}: {
  profiles: ProfileConfig[];
  activeSlug: string | null;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="w-full max-w-xl">
      <div className="text-center mb-10">
        <div className="font-serif text-4xl text-ink-50 mb-3 leading-none">
          LifeOS
        </div>
        <p className="text-sm text-ink-300">Who&apos;s using it?</p>
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
              className={`card text-left transition py-8 ${
                active ? "border-white/20" : ""
              } ${inFlight ? "opacity-60" : "hover:bg-white/[0.03]"}`}
            >
              <div className="card-glow" />
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full grid place-items-center text-2xl font-serif border ${p.accentClass}`}
                >
                  {p.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-xl text-ink-50">
                    {p.name}
                  </div>
                  <div className="text-xs text-ink-400 truncate">
                    {p.email}
                  </div>
                  {active && (
                    <div className="text-[10px] uppercase tracking-wider text-accent-green mt-1">
                      Currently active
                    </div>
                  )}
                </div>
                {inFlight && (
                  <div className="text-xs text-ink-400">…</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2 text-center">
          {error}
        </div>
      )}

      <p className="text-[11px] text-ink-400 text-center mt-8 leading-relaxed">
        First-time pick auto-creates your account and workspace.
        <br />
        Switch profiles any time from the sidebar.
      </p>
    </div>
  );
}
