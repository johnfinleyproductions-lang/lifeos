import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";

/**
 * Reads today's morning row if signed in. Otherwise shows the empty state.
 */
export async function ManifestoCard() {
  const { user } = await getAuthContext();
  const morning = user ? (await getTodayCheckin(user.id)).morning : null;
  const hasManifesto = morning !== null;

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
            Morning manifesto
          </div>
          {hasManifesto && morning ? (
            <>
              <p className="font-serif text-2xl text-ink-50 leading-snug">
                {morning.manifesto}
              </p>
              <p className="text-sm text-ink-300 mt-2">
                Energy {morning.energy}/5 · {morning.priorities.length}{" "}
                {morning.priorities.length === 1 ? "priority" : "priorities"}{" "}
                locked
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-2xl text-ink-50 leading-snug">
                The day hasn&apos;t started yet.
              </p>
              <p className="text-sm text-ink-300 mt-2">
                Five quick prompts to set your intention. Takes about 90
                seconds.
              </p>
            </>
          )}
        </div>
        <div className="shrink-0">
          <Link
            href="/morning"
            className="inline-block px-4 py-2 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 transition"
          >
            {hasManifesto ? "Edit" : "Start"} →
          </Link>
        </div>
      </div>
    </div>
  );
}
