import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { Gauge } from "@/components/field/Gauge";
import { Watermark } from "@/components/field/Watermark";

/**
 * The hero of the day. Reads today's morning row if signed in, otherwise
 * shows the invitation.
 *
 * The manifesto is set at display size in the serif, because it is the
 * one sentence on this screen the user wrote themselves. It used to be a
 * 24px line inside a labelled card, which made their own words smaller
 * than the page chrome around them.
 */
export async function ManifestoCard() {
  const { user } = await getAuthContext();
  const morning = user ? (await getTodayCheckin(user.id)).morning : null;

  return (
    <div className="sheet sheet-hi sheet-cut shadow-mis px-[30px] pt-[30px] pb-6">
      {!morning && <Watermark name="sun" size={200} className="-right-10 -bottom-14" />}
      {morning ? (
        <>
          <p className="font-serif font-normal text-[clamp(24px,3.4vw,41px)] leading-[1.16] tracking-[-0.012em] m-0 max-w-[30ch] text-balance fx-print">
            <span className="text-accent-spot">&ldquo;</span>
            {morning.manifesto}
            <span className="text-accent-spot">&rdquo;</span>
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
        </>
      ) : (
        <>
          <p className="font-serif italic text-[clamp(21px,3vw,30px)] leading-[1.25] text-ink-300 m-0 max-w-[26ch] fx-print">
            The day has no manifesto yet.
          </p>
          <div className="flex items-center gap-4 mt-5 pt-4 border-t-[1.5px] border-ink-500">
            <Link href="/morning" className="btn btn-spot">
              Write this morning
            </Link>
            <span className="text-[12.5px] text-ink-300">
              Six prompts, about ninety seconds
            </span>
          </div>
        </>
      )}
    </div>
  );
}
