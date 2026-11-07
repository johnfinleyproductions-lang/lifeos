import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { FutureEditor } from "@/components/compass/FutureEditor";
import { PageStamp } from "@/components/PageStamp";
import {
  futurePathsSchema,
  type FuturePaths,
} from "@/lib/compass/schema";

export default async function FuturePage() {
  const { user } = await requireUserContext();

  const [row] = await db
    .select({ futurePaths: lifeosCompass.futurePaths })
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  const parsed =
    row?.futurePaths != null
      ? futurePathsSchema.safeParse(row.futurePaths)
      : null;
  const initial: FuturePaths =
    parsed && parsed.success ? parsed.data : {};

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Future"
        subtitle="Sketches across four horizons. Where you're aiming."
        backHref="/compass"
        backLabel="Compass"
      />

      <FutureEditor initial={initial} />
    </div>
  );
}
