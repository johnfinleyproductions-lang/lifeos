/**
 * Shared SVG definitions, mounted once in the layout and sized to
 * nothing.
 *
 * `rough` is the cut edge: a little fractal noise displacing whatever
 * is drawn through it by about a pixel, so a border looks cut with a
 * knife rather than ruled with a pen. Applied to pseudo-elements only,
 * never to anything carrying type.
 */
export function PressDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute" }}
    >
      <defs>
        <filter id="rough" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008"
            numOctaves="1"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
