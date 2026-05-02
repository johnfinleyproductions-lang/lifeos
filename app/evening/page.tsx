import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { EveningWizard } from "@/components/evening/EveningWizard";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import {
  eveningShutdownSchema,
  type EveningShutdown,
} from "@/lib/manifesto/evening-schema";

export default async function EveningPage() {
  const { user } = await requireUserContext();
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      morning: lifeosDailyCheckins.morning,
      evening: lifeosDailyCheckins.evening,
      ritualDepth: lifeosDailyCheckins.ritualDepth,
    })
    .from(lifeosDailyCheckins)
    .where(
      and(
        eq(lifeosDailyCheckins.userId, user.id),
        eq(lifeosDailyCheckins.entryDate, today),
      ),
    )
    .limit(1);

  const morningParsed =
    rows[0]?.morning != null
      ? morningManifestoSchema.safeParse(rows[0].morning)
      : null;
  const morningPriorities =
    morningParsed && morningParsed.success ? morningParsed.data.priorities : [];

  const eveningParsed =
    rows[0]?.evening != null
      ? eveningShutdownSchema.safeParse(rows[0].evening)
      : null;
  const initial: EveningShutdown | null =
    eveningParsed && eveningParsed.success ? eveningParsed.data : null;

  const ritualDepth =
    rows[0]?.ritualDepth === "deep" ? "deep" : "standard";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>
      <EveningWizard
        initial={initial}
        morningPriorities={morningPriorities}
        ritualDepth={ritualDepth}
      />
    </div>
  );
}
