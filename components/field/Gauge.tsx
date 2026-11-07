/**
 * A one-to-five reading drawn as seeds in a split pod rather than five
 * bars. The pod and every seed are inked in outline; the seeds that
 * count take the spot ink on a second pass, which lands a hair off its
 * outline the way a riso's second colour does.
 *
 * Reads left to right, so three of five is three filled seeds and two
 * hollow ones, and the whole thing is the width of a short word.
 */
export function Gauge({
  value,
  max = 5,
  ink = "var(--spot)",
}: {
  value: number;
  max?: number;
  ink?: string;
}) {
  const w = 12 + max * 11;
  const seeds = Array.from({ length: max }, (_, i) => ({
    x: 11 + i * 11,
    // a hand does not place five seeds on one line
    y: 9 + [-0.4, 0.5, -0.2, 0.6, 0.1][i % 5],
  }));

  return (
    <svg
      width={w}
      height="18"
      viewBox={`0 0 ${w} 18`}
      role="img"
      aria-label={`${value} of ${max}`}
      style={{ overflow: "visible", display: "inline-block" }}
    >
      {/* the spot pass, printed first and slightly off */}
      <g fill={`rgb(${ink})`} transform="translate(0.9 0.7)">
        {seeds.slice(0, value).map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r="3.1" />
        ))}
      </g>
      {/* the ink pass on top: the pod, then every seed's outline */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={`M3 9.5C9 3 ${w * 0.35} 0.5 ${w * 0.55} 1.2S${w - 7} 4.5 ${w - 2} 9.2C${w - 8} 14.5 ${w * 0.6} 17 ${w * 0.4} 16.6S8 14.8 3 9.5z`}
        />
        <path d="M3 9.5L0 8.5" />
        {seeds.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r="2.9" />
        ))}
      </g>
    </svg>
  );
}
