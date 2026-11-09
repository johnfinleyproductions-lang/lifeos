import { eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { futurePathsSchema, type FuturePaths } from "@/lib/compass/schema";
import { PageStamp } from "@/components/PageStamp";
import { CompassSheet, type CompassTab } from "./CompassSheet";

/**
 * The compass: one sheet, two tabs. Anchors (mission, eulogy, success)
 * and Horizons (the four future sketches, formerly /future). The ideal
 * week is gone: it was seven textareas nothing read, and its route now
 * lands here. The stored ideal_week column is left untouched.
 */
export default async function CompassPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUserContext();
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: CompassTab = tabParam === "horizons" ? "horizons" : "anchors";

  const [row] = await db
    .select()
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  const parsed =
    row?.futurePaths != null
      ? futurePathsSchema.safeParse(row.futurePaths)
      : null;
  const futurePaths: FuturePaths = parsed && parsed.success ? parsed.data : {};

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Compass"
        subtitle="The long-arc anchors, and the horizons they point at."
      />

      <CompassSheet
        initial={{
          mission: row?.mission ?? null,
          eulogy: row?.eulogy ?? null,
          successDefinition: row?.successDefinition ?? null,
          futurePaths,
        }}
        initialTab={initialTab}
      />
    </div>
  );
}
