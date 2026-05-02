import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { morningManifestoSchema } from "@/lib/manifesto/schema";

/**
 * Reads today's morning row if signed in. Otherwise shows the empty state.
 * Phase 2 expands this to also pull priorities into the PlanCard.
 */
export async function ManifestoCard() {
  const { user } = await getAuthContext();
  let manifestoText: string | null = null;
  let energy: number | null = null;
  let priorityCount = 0;

  if (user) {
    const today = format(new Date(), "yyyy-MM-dd");
    const rows = await db
      .select({ morning: lifeosDailyCheckins.morning })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, user.id),
          eq(lifeosDailyCheckins.entryDate, today),
        ),
      )
      .limit(1);

    if (rows[0]?.morning != null) {
      const parsed = morningManifestoSchema.safeParse(rows[0].morning);
      if (parsed.success) {
        manifestoText = parsed.data.manifesto;
        energy = parsed.data.energy;
        priorityCount = parsed.data.priorities.length;
      }
    }
  }

  const hasManifesto = manifestoText !== null;

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
            Morning manifesto
          </div>
          {hasManifesto ? (
            <>
              <p className="font-serif text-2xl text-ink-50 leading-snug">
                {manifestoText}
              </p>
              <p className="text-sm text-ink-300 mt-2">
                Energy {energy}/5 · {priorityCount}{" "}
                {priorityCount === 1 ? "priority" : "priorities"} locked
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
