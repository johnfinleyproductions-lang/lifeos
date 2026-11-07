/**
 * The margin a press leaves on a sheet: a registration crosshair, the
 * ink swatches for the run, and the edition line. On a real two-colour
 * riso these sit outside the trim and get cut off. Here they stay.
 *
 * Sits at the foot of every page. Decorative, so it is hidden from
 * screen readers entirely.
 */
export function PressMargin({ sheet }: { sheet?: number }) {
  const inks = [
    ["--spot", "fluorescent orange"],
    ["--green", "green"],
    ["--sky", "blue"],
    ["--violet", "violet"],
    ["--rose", "rose"],
    ["--gold", "gold"],
  ] as const;

  return (
    <div
      aria-hidden="true"
      className="mt-12 pt-4 border-t border-ink-600 flex items-center gap-4 text-ink-400 select-none"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" className="shrink-0">
        <circle
          cx="6.5"
          cy="6.5"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M6.5 0v13M0 6.5h13"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      <div className="flex gap-0.5 shrink-0">
        {inks.map(([v, name]) => (
          <span
            key={v}
            title={name}
            className="w-3 h-3 block"
            style={{ background: `rgb(var(${v}))` }}
          />
        ))}
      </div>

      <span className="text-[10.5px] tabular-nums">
        LifeOS, field log{sheet ? `, sheet ${sheet}` : ""}
      </span>

      <span className="flex-1 border-b border-dotted border-ink-600" />

      <span className="text-[10.5px]">two passes, grey stock</span>
    </div>
  );
}
