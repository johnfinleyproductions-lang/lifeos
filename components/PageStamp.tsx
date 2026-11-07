import Link from "next/link";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dayOfYear(d: Date) {
  return Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5,
  );
}

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
  const now = new Date();

  return (
    <header className="flex items-start justify-between gap-4 md:gap-5 mb-6">
      <div className="min-w-0">
        <div
          className="text-xs text-ink-300"
          style={{ fontVariationSettings: "'wdth' 100, 'wght' 620" }}
        >
          {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}
          <span className="inline-block w-5" />
          <b className="text-ink-50 tabular-nums">No. {dayOfYear(now)}</b>
        </div>
        {title && <h1 className="t-h1 mt-[7px]">{title}</h1>}
        {subtitle && (
          <p className="text-[14.5px] text-ink-300 mt-2 max-w-[62ch]">
            {subtitle}
          </p>
        )}
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
