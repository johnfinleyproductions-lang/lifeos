import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { ManifestoWizard } from "@/components/morning/ManifestoWizard";
import {
  morningManifestoSchema,
  type MorningManifesto,
} from "@/lib/manifesto/schema";

export default async function MorningPage() {
  const { user } = await requireUserContext();
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({ morning: lifeosDailyCheckins.morning })
    .from(lifeosDailyCheckins)
    .where(
      and(
        eq(lifeosDailyCheckins.userId, user.id),
        eq(lifeosDailyCheckins.entryDate, today),
      ),
    )
    .limit(1);

  // The morning column is jsonb — safeParse to get a typed value.
  const parsed =
    rows[0]?.morning != null
      ? morningManifestoSchema.safeParse(rows[0].morning)
      : null;
  const initial: MorningManifesto | null =
    parsed && parsed.success ? parsed.data : null;

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
      <ManifestoWizard initial={initial} />
    </div>
  );
}
