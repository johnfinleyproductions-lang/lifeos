import Link from "next/link";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { WeekEditor } from "@/components/compass/WeekEditor";
import { idealWeekSchema, type IdealWeek } from "@/lib/compass/schema";

export default async function WeekPage() {
  const { user } = await requireUserContext();

  const [row] = await db
    .select({ idealWeek: lifeosCompass.idealWeek })
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  const parsed =
    row?.idealWeek != null
      ? idealWeekSchema.safeParse(row.idealWeek)
      : null;
  const initial: IdealWeek = parsed && parsed.success ? parsed.data : {};

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/compass"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Compass
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="font-serif text-3xl text-ink-50 mb-1">Ideal week</h1>
        <p className="text-sm text-ink-300">
          The rhythm you want — anchors, blocks, rituals. Not a schedule.
        </p>
      </div>

      <WeekEditor initial={initial} />
    </div>
  );
}
