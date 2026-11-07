import { requireUserContext } from "@/lib/auth/server-helpers";
import { getCollection } from "@/lib/collection/observe";
import { fieldMarksShown } from "@/lib/collection/field-marks";
import { CollectionSheet } from "@/components/collection/CollectionSheet";
import { PageStamp } from "@/components/PageStamp";

/**
 * The collection: every first, pressed and dated.
 *
 * Read-only, and derived on each visit from the tables the rest of the
 * app already writes. There is nothing to earn here that is not already
 * in the log, and nothing here can be lost.
 */
export default async function CollectionPage() {
  const { user } = await requireUserContext();
  const [collection, marks] = await Promise.all([
    getCollection(user.id),
    fieldMarksShown(),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageStamp
        title="The collection"
        subtitle="Every first, pressed and dated. A record of what has already happened, not a list of what to do."
      />

      <div className="tab-row mb-6">
        <span className="tab">Specimens</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {collection.recorded} of {collection.total} recorded
        </span>
      </div>

      {!marks && (
        <p className="text-[12.5px] text-ink-400 -mt-3 mb-5">
          Field marks are hidden elsewhere in the app. This page keeps the
          record either way.
        </p>
      )}

      <CollectionSheet collection={collection} />
    </div>
  );
}
