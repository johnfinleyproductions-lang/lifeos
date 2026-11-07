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
                  <span className="block t-h2">{p.name}</span>
                  <span className="block text-[12.5px] text-ink-400 truncate mt-0.5">
                    {p.email}
                  </span>
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
