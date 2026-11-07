import { desc, eq } from "drizzle-orm";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { ManifestoWizard } from "@/components/morning/ManifestoWizard";
import { PageStamp } from "@/components/PageStamp";
import {
  morningManifestoSchema,
  type MorningManifesto,
} from "@/lib/manifesto/schema";
import { getCarriedLines } from "@/lib/manifesto/carry";
import { depthChoiceFromStored } from "@/lib/settings/ritual-depth";

export default async function MorningPage() {
  const { user } = await requireUserContext();
  const today = todayKey();

  // The most recent row carries the last depth pick. If today's row exists
  // it is the most recent one, and it also carries today's manifesto.
  const [[latest], carried] = await Promise.all([
    db
      .select({
        entryDate: lifeosDailyCheckins.entryDate,
        morning: lifeosDailyCheckins.morning,
        ritualDepth: lifeosDailyCheckins.ritualDepth,
      })
      .from(lifeosDailyCheckins)
      .where(eq(lifeosDailyCheckins.userId, user.id))
      .orderBy(desc(lifeosDailyCheckins.entryDate))
      .limit(1),
    getCarriedLines(user.id),
  ]);

  const todayRow = latest?.entryDate === today ? latest : null;

  // The morning column is jsonb — safeParse to get a typed value.
  const parsed =
    todayRow?.morning != null
      ? morningManifestoSchema.safeParse(todayRow.morning)
      : null;
  const initial: MorningManifesto | null =
    parsed && parsed.success ? parsed.data : null;

  return (
    <div className="max-w-[1080px] mx-auto">
      <PageStamp title="Morning manifesto" backLabel="Leave" />
      <ManifestoWizard
        initial={initial}
        initialDepth={depthChoiceFromStored(latest?.ritualDepth)}
        carried={initial ? [] : carried}
      />
    </div>
  );
}
