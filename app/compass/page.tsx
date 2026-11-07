import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { CompassEditor } from "@/components/compass/CompassEditor";
import { PageStamp } from "@/components/PageStamp";

export default async function CompassPage() {
  const { user } = await requireUserContext();

  const [row] = await db
    .select()
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Compass"
        subtitle="Mission, eulogy, success. The long-arc anchors."
        right={
          <>
            <Link href="/future" className="btn btn-sm btn-ghost">
              Future
            </Link>
            <Link href="/week" className="btn btn-sm btn-ghost">
              Ideal week
            </Link>
          </>
        }
      />

      <CompassEditor
        initial={{
          mission: row?.mission ?? null,
          eulogy: row?.eulogy ?? null,
          successDefinition: row?.successDefinition ?? null,
        }}
      />
    </div>
  );
}
