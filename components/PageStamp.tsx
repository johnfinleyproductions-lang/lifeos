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
 */
export function PageStamp({
  title,
  subtitle,
  right,
  back = true,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const now = new Date();

  return (
    <header className="flex items-start justify-between gap-5 mb-6">
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
          <p className="t-read text-ink-300 mt-2 max-w-[62ch]">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {back && (
          <Link href="/" className="btn btn-sm btn-ghost">
            Today
          </Link>
        )}
      </div>
    </header>
  );
}
