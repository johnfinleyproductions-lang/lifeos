import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getCollection } from "@/lib/collection/observe";
import { fieldMarksShown } from "@/lib/collection/field-marks";
import { Plate } from "@/components/field/plates";

/**
 * One line on Today, and only on a day something was first recorded:
 * the name of the specimen and a way to the collection. Every other day
 * this renders nothing, so the mechanic is invisible unless it has
 * something true to say.
 */
export async function CollectionNote() {
  const { user } = await getAuthContext();
  if (!user) return null;
  if (!(await fieldMarksShown())) return null;

  const { newToday } = await getCollection(user.id);
  if (newToday.length === 0) return null;

  return (
    <div className="sheet sheet-bare flex items-center gap-4 flex-wrap">
      <span className="shrink-0 text-ink-50 flex gap-1">
        {newToday.slice(0, 3).map((s) => (
          <Plate key={s.key} name={s.plate} size={32} />
        ))}
      </span>
      <span className="t-read text-ink-300 m-0 flex-1 min-w-[16ch]">
        New to the collection today:{" "}
        {newToday.map((s, i) => (
          <span key={s.key}>
            <span className="text-ink-50">{s.name}</span>
            {i < newToday.length - 2
              ? ", "
              : i === newToday.length - 2
                ? " and "
                : "."}
          </span>
        ))}
      </span>
      <Link href="/collection" className="btn btn-sm btn-ghost shrink-0">
        Open the collection
      </Link>
    </div>
  );
}
