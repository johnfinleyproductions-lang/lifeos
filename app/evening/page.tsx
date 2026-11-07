import { desc, eq } from "drizzle-orm";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { EveningWizard } from "@/components/evening/EveningWizard";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import { PageStamp } from "@/components/PageStamp";
import {
  eveningShutdownSchema,
  type EveningShutdown,
} from "@/lib/manifesto/evening-schema";
import { depthChoiceFromStored } from "@/lib/settings/ritual-depth";

export default async function EveningPage() {
  const { user } = await requireUserContext();
  const today = todayKey();

  // The most recent row carries the last depth pick. If today's row exists
  // it is the most recent one, and it carries the morning and any evening.
  const [latest] = await db
    .select({
      entryDate: lifeosDailyCheckins.entryDate,
      morning: lifeosDailyCheckins.morning,
      evening: lifeosDailyCheckins.evening,
      ritualDepth: lifeosDailyCheckins.ritualDepth,
    })
    .from(lifeosDailyCheckins)
    .where(eq(lifeosDailyCheckins.userId, user.id))
    .orderBy(desc(lifeosDailyCheckins.entryDate))
    .limit(1);

  const todayRow = latest?.entryDate === today ? latest : null;

  const morningParsed =
    todayRow?.morning != null
      ? morningManifestoSchema.safeParse(todayRow.morning)
      : null;
  const morningPriorities =
    morningParsed && morningParsed.success ? morningParsed.data.priorities : [];

  const eveningParsed =
    todayRow?.evening != null
      ? eveningShutdownSchema.safeParse(todayRow.evening)
      : null;
  const initial: EveningShutdown | null =
    eveningParsed && eveningParsed.success ? eveningParsed.data : null;

  return (
    <div className="max-w-[1080px] mx-auto">
      <PageStamp title="Evening shutdown" backLabel="Leave" />
      <EveningWizard
        initial={initial}
        morningPriorities={morningPriorities}
        initialDepth={depthChoiceFromStored(latest?.ritualDepth)}
      />
    </div>
  );
}
