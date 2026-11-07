import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { WeekEditor } from "@/components/compass/WeekEditor";
import { PageStamp } from "@/components/PageStamp";
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
      <PageStamp
        title="Ideal week"
        subtitle="The rhythm you want: anchors, blocks, rituals. Not a schedule."
        backHref="/compass"
        backLabel="Compass"
      />

      <WeekEditor initial={initial} />
    </div>
  );
}
