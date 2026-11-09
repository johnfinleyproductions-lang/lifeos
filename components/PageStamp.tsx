import Link from "next/link";
import { PlateForRoute } from "@/components/field/PlateForRoute";
import { dayOfYear, formatDay, todayKey } from "@/lib/time/day";

/**
 * The stamp every page carries: the date as a log entry would write it,
 * the day's number in the year, and the page's own name underneath.
 *
 * Replaces the per-page header that paired an arrow-in-link ("← Today")
 * with a tracked-out caps date joined by a middle dot. Seventeen pages
 * had their own copy of it.
 *
 * `backHref` and `backLabel` cover the pages whose way out was not Today:
 * Future and Ideal week go back to Compass, a protocol goes back to
 * Identity, the journal archives go back to the journal page. `right`
 * takes a page's own cross-links, as buttons.
 */
export function PageStamp({
  title,
  subtitle,
  right,
  back = true,
  backHref = "/",
  backLabel = "Today",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const today = todayKey();

  return (
    <header className="runhead flex items-start justify-between gap-4 md:gap-5 mb-7">
      <div className="flex items-center gap-4 min-w-0">
        {/* every screen carries its own specimen plate, mounted */}
        <span className="plate-tile">
          <span className="hidden sm:block">
            <PlateForRoute size={46} />
          </span>
          <span className="sm:hidden">
            <PlateForRoute size={32} />
          </span>
        </span>
        <div className="min-w-0">
          <div
            className="text-xs text-ink-300"
            style={{ fontVariationSettings: "'wdth' 100, 'wght' 620" }}
          >
            {formatDay(today, "EEEE, d MMMM")}
            <span className="inline-block w-3 sm:w-5" />
            <b className="text-ink-50 tabular-nums whitespace-nowrap">No. {dayOfYear(today)}</b>
          </div>
          {title && <h1 className="t-h1 mt-[7px]">{title}</h1>}
          {subtitle && <p className="fig mt-1.5 max-w-[62ch]">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap max-w-[50%]">
        {right}
        {back && (
          <Link href={backHref} className="btn btn-sm btn-ghost">
            {backLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
