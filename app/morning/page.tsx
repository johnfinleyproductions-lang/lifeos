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
    <div className="max-w-[1080px] mx-auto">
      <header className="flex items-start justify-between gap-5 mb-6">
        <div>
          <div
            className="text-xs text-ink-300"
            style={{ fontVariationSettings: "'wdth' 100, 'wght' 620" }}
          >
            {format(new Date(), "EEEE, d MMMM")}
          </div>
          <h1 className="t-h1 mt-[7px]">Morning manifesto</h1>
        </div>
        <Link href="/" className="btn btn-sm btn-ghost shrink-0">
          Leave
        </Link>
      </header>
      <ManifestoWizard initial={initial} />
    </div>
  );
}
