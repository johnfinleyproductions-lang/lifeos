import Link from "next/link";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { CompassEditor } from "@/components/compass/CompassEditor";

export default async function CompassPage() {
  const { user } = await requireUserContext();

  const [row] = await db
    .select()
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
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

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-50 mb-1">Compass</h1>
          <p className="text-sm text-ink-300">
            Mission, eulogy, success. The long-arc anchors.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/future"
            className="text-xs text-ink-400 hover:text-ink-100 transition"
          >
            Future →
          </Link>
          <Link
            href="/week"
            className="text-xs text-ink-400 hover:text-ink-100 transition"
          >
            Ideal week →
          </Link>
        </div>
      </div>

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
