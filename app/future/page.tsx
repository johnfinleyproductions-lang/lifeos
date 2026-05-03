import Link from "next/link";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { FutureEditor } from "@/components/compass/FutureEditor";
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
        <h1 className="font-serif text-3xl text-ink-50 mb-1">Future</h1>
        <p className="text-sm text-ink-300">
          Sketches across four horizons. Where you&apos;re aiming.
        </p>
      </div>

      <FutureEditor initial={initial} />
    </div>
  );
}
