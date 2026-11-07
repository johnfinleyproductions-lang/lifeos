import { Plate } from "./plates";

/**
 * A specimen plate printed large and faint behind an empty state, and
 * bleeding off the sheet's corner. An empty panel in a field guide is
 * where the big drawing goes.
 *
 * Clips itself, so the parent only needs `relative`; a cut sheet keeps
 * its edge. The stroke is thinned for the size, since a 40-unit plate
 * scaled up four times would print its lines six pixels wide.
 */
export function Watermark({
  name,
  size = 168,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <span
        className={`wm absolute -right-7 -bottom-9 text-ink-50 ${className}`}
      >
        <Plate name={name} size={size} />
      </span>
    </span>
  );
}
