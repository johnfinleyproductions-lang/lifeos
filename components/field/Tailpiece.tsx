/**
 * A tail-piece: the small drawn sprig an old printer set at the foot of
 * a section to say the text was done. One ink, one pass, centred.
 */
export function Tailpiece({ className = "" }: { className?: string }) {
  return (
    <svg
      width="58"
      height="28"
      viewBox="0 0 58 28"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ overflow: "visible" }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* the stem, bending up to the right */}
      <path d="M3 22C16 20 30 14 51 4" />
      {/* leaves on alternate sides, each a little different */}
      <path d="M12 20c-5-3-6-8-4-11 4 2 6 7 4 11z" />
      <path d="M12 20l-3-8" />
      <path d="M22 17c5 2 6 6 4 10-4-2-6-6-4-10z" />
      <path d="M22 17l3 7" />
      <path d="M32 13c-5-3-5-8-3-11 4 2 5 7 3 11z" />
      <path d="M32 13l-2-8" />
      <path d="M42 8c5 2 6 6 4 10-4-2-6-6-4-10z" />
      <path d="M42 8l3 7" />
      {/* the bud at the tip */}
      <path d="M51 4c1-2 3-2 4-1-1 1-2 2-4 1z" />
    </svg>
  );
}
