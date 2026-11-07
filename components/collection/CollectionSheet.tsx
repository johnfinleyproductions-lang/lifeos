import { format, parseISO } from "date-fns";
import { FAMILIES } from "@/lib/collection/catalogue";
import type { Collection, Recorded } from "@/lib/collection/observe";
import { Plate } from "@/components/field/plates";
import { Watermark } from "@/components/field/Watermark";

/**
 * The collection, laid out as a field guide lays out a family: a
 * heading per family, then each specimen with its plate, its name, its
 * field mark, and the line under it that says when it was first seen.
 *
 * A specimen not yet recorded still gets its page. That is what a field
 * guide is: the whole list, with the ones you have seen ticked. It
 * prints in one faint pass with no date, and nothing on it says how far
 * off it is.
 */
export function CollectionSheet({ collection }: { collection: Collection }) {
  return (
    <>
      {collection.recorded === 0 && (
        <div className="sheet sheet-bare sheet-cut text-center py-10 relative mb-7">
          <Watermark name="press" size={170} />
          <div className="t-h2 mb-2">Nothing pressed yet.</div>
          <p className="text-[14.5px] text-ink-300 max-w-[42ch] mx-auto m-0">
            The first morning manifesto starts the collection. Everything
            after that is recorded on the day it happens, with the date.
          </p>
        </div>
      )}
      <Families collection={collection} />
    </>
  );
}

function Families({ collection }: { collection: Collection }) {
  return (
    <div className="space-y-7">
      {FAMILIES.map((f) => {
        const members = collection.specimens.filter((s) => s.family === f.key);
        const seen = members.filter((s) => s.firstObs !== null).length;
        return (
          <section key={f.key}>
            <div className="tab-row">
              <span className="tab">{f.label}</span>
              <span className="fill" />
              <span className="text-[11.5px] text-ink-400 tabular-nums">
                {seen} of {members.length}
              </span>
            </div>
            <div className="sheet py-1 md:grid md:grid-cols-2 md:gap-x-8">
              {members.map((s) => (
                <SpecimenRow key={s.key} s={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SpecimenRow({ s }: { s: Recorded }) {
  const seen = s.firstObs !== null;
  return (
    <div
      className="specimen"
      data-unseen={seen ? undefined : ""}
      data-today={s.today ? "" : undefined}
    >
      <span className="specimen-plate text-ink-50">
        <Plate name={s.plate} size={40} under={seen ? "var(--spot)" : null} />
      </span>
      <div className="specimen-name">{s.name}</div>
      <div className="specimen-mark">{s.mark}</div>
      <div className="specimen-obs">
        {seen ? (
          <>
            first obs. {s.today ? "today" : format(parseISO(s.firstObs!), "d MMM yyyy")}
            {s.count !== null && s.countNoun && s.count > 0 && (
              <>
                {", "}
                {s.count} {s.count === 1 ? s.countNoun[0] : s.countNoun[1]}
              </>
            )}
          </>
        ) : (
          "not yet recorded"
        )}
      </div>
    </div>
  );
}
