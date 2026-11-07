import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { Gauge } from "@/components/field/Gauge";
import { Watermark } from "@/components/field/Watermark";

/**
 * The manifesto, in the two sizes the day gives it.
 *
 * Before it is written: the sun plate and the one orange action on the
 * page. That is the hero, and the only time the page asks for anything.
 *
 * Once written, the three lead the page and the manifesto drops to one
 * italic serif line beneath them (`mode="line"`). It is still the one
 * sentence on the screen the user wrote themselves, which is why it
 * stays in the serif; it no longer needs to be the largest thing on
 * the sheet once the day has moved from intention to doing.
 */
export async function ManifestoCard({
  mode = "hero",
}: {
  mode?: "hero" | "line";
}) {
  const { user } = await getAuthContext();
  const morning = user ? (await getTodayCheckin(user.id)).morning : null;

  if (!morning) {
    return (
      <div className="sheet sheet-hi sheet-cut shadow-mis px-[30px] pt-[30px] pb-6 relative">
        <Watermark name="sun" size={200} className="-right-10 -bottom-14" />
        <p className="font-serif italic text-[clamp(21px,3vw,30px)] leading-[1.25] text-ink-300 m-0 max-w-[26ch] fx-print">
          The day has no manifesto yet.
        </p>
        <div className="flex items-center gap-4 mt-5 pt-4 border-t-[1.5px] border-ink-500 flex-wrap">
          <Link href="/morning" className="btn btn-spot btn-lg">
            Write this morning
          </Link>
          <span className="text-[12.5px] text-ink-300">
            Quick, thirty seconds. Or the full five cards
          </span>
        </div>
      </div>
    );
  }

  if (mode === "line") {
    return (
      <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap pt-1">
        {/*
          A Quick morning never asks for a manifesto, so the field is "".
          Printing the quote marks around nothing left a pair of orange
          commas floating on the page.
        */}
        <p className="font-serif italic text-[clamp(17px,1.7vw,20px)] leading-[1.4] m-0 text-ink-100 min-w-[26ch] flex-1">
          {morning.manifesto ? (
            <>
              <span className="text-accent-spot not-italic">&ldquo;</span>
              {morning.manifesto}
              <span className="text-accent-spot not-italic">&rdquo;</span>
            </>
          ) : (
            <span className="text-ink-300">A quick morning. The three are above.</span>
          )}
        </p>
        <span
          className="flex items-center gap-[7px] text-[12px] text-ink-300 shrink-0"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          Energy <Gauge value={morning.energy} />
          <Link
            href="/morning"
            className="ml-2 underline decoration-ink-500 hover:decoration-accent-spot text-ink-300"
          >
            Revise
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="sheet sheet-hi sheet-cut shadow-mis px-[30px] pt-[30px] pb-6">
      <p className="font-serif font-normal text-[clamp(24px,3.4vw,41px)] leading-[1.16] tracking-[-0.012em] m-0 max-w-[30ch] text-balance fx-print">
        {morning.manifesto ? (
          <>
            <span className="text-accent-spot">&ldquo;</span>
            {morning.manifesto}
            <span className="text-accent-spot">&rdquo;</span>
          </>
        ) : (
          /* Quick morning: the three carry the page instead. */
          <span className="italic">The day is set.</span>
        )}
      </p>
      <div className="flex items-center gap-4 flex-wrap mt-5 pt-4 border-t-[1.5px] border-ink-500">
        <span
          className="flex items-center gap-[7px] text-[12.5px] text-ink-300"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          Energy <Gauge value={morning.energy} />
        </span>
        <span
          className="text-[12.5px] text-ink-300"
          style={{ fontVariationSettings: "'wght' 600" }}
        >
          {morning.priorities.length}{" "}
          {morning.priorities.length === 1 ? "priority" : "priorities"} set
        </span>
        <Link href="/morning" className="btn btn-sm btn-ghost ml-auto">
          Revise
        </Link>
      </div>
    </div>
  );
}
