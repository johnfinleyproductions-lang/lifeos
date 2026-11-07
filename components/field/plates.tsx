/**
 * Specimen plates.
 *
 * One small drawing per screen, in the spirit of a natural-history field
 * guide: a sun for the morning, a moth for dusk, a sprout for the things
 * you repeat, a trellis for the structure that holds them up.
 *
 * Drawn rather than iconographic. Lines are deliberately uneven and the
 * shapes are not symmetrical, because a plate in a field guide was drawn
 * by somebody. Nothing here is a glyph from an icon set.
 *
 * Each is a bare <g> on a 40x40 field. The Plate component below prints
 * it twice, the under-pass offset and in a second ink, which is what a
 * two-colour riso press does when the paper shifts between passes.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const PLATES: Record<string, React.ReactNode> = {
  /* a pressed leaf, for the day you are standing in */
  leaf: (
    <g {...S}>
      <path d="M20 34c-6-7-9-14-7-20 2-7 9-9 15-7 2 6 0 14-4 19-2 3-3 5-4 8z" />
      <path d="M20 34c0-8 1-14 5-20" />
      <path d="M19 24l-5-3M21 19l5-3M18 29l-4-2" />
    </g>
  ),

  /* the sun, low and wide, the way it sits at six */
  sun: (
    <g {...S}>
      <circle cx="20" cy="22" r="7" />
      <path d="M20 8v3.5M20 32.5V36M8 22h3.5M28.5 22H32" />
      <path d="M11.6 13.6l2.5 2.5M25.9 27.9l2.5 2.5M28.4 13.6l-2.5 2.5M14.1 27.9l-2.5 2.5" />
    </g>
  ),

  /* a moth, which is what arrives once the sun has gone. Wings swept
     back and triangular, not round: rounded wings and a pair of eyes
     read as an owl. */
  moth: (
    <g {...S}>
      <path d="M20 13v16" />
      <path d="M19 17h2M19 21h2M19 25h2" />
      <path d="M19.5 16L8 10c-1 6 0 12 4 15l7-4z" />
      <path d="M20.5 16L32 11c1 6-1 12-5 14l-6.5-4z" />
      <path d="M20 13c-1-3-3-4-5-4M20 13c1-3 3-4 5-4" />
      <path d="M12 15l3 2M28 16l-3 2" />
    </g>
  ),

  /* an hourglass, mid-pour */
  hourglass: (
    <g {...S}>
      <path d="M13 8h14M13 34h14" />
      <path d="M14 8c0 6 6 10 6 13s-6 7-6 13" />
      <path d="M26 8c0 6-6 10-6 13s6 7 6 13" />
      <path d="M20 23v6" />
      <path d="M16 32c1-2 2.5-3 4-3s3 1 4 3" />
    </g>
  ),

  /* a sprout: the small thing done again */
  sprout: (
    <g {...S}>
      <path d="M20 35V17" />
      <path d="M20 22c-5 0-8-3-8-7 5-1 8 2 8 7z" />
      <path d="M20 19c4-1 6-4 5-8-4 0-6 3-5 8z" />
      <path d="M13 35h14" />
    </g>
  ),

  /* a trellis: the structure that lets a habit survive a bad week */
  trellis: (
    <g {...S}>
      <path d="M11 9v26M20 7v28M29 9v26" />
      <path d="M8 16h24M8 24h24M8 31h24" />
      <path d="M26 20c3-1 5 1 4 4-3 1-5-1-4-4z" />
    </g>
  ),

  /* a mountain with a mark near the top, not on it */
  mountain: (
    <g {...S}>
      <path d="M6 31l9-15 5 8 4-6 10 13z" />
      <path d="M26 24l-3 4" />
      <path d="M24 18v-5l4 1.5-4 2" />
    </g>
  ),

  /* a compass rose, drawn once, so the arms do not match */
  compass: (
    <g {...S}>
      <circle cx="20" cy="21" r="12" />
      <path d="M20 9l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
      <circle cx="20" cy="21" r="1.4" />
    </g>
  ),

  /* a feather: what you are becoming, shed and kept */
  feather: (
    <g {...S}>
      <path d="M13 33c-2-8 1-16 7-21 4-3 8-3 9-1 1 3-1 8-5 12-4 4-8 7-11 10z" />
      <path d="M13 33L28 15" />
      <path d="M18 24l5-1M20 28l5-2M17 20l5-2" />
      <path d="M13 33l-3 3" />
    </g>
  ),

  /* a seed pod, split, with what is inside it */
  seedpod: (
    <g {...S}>
      <path d="M20 7c6 5 8 13 5 20-2 5-4 7-5 8-1-1-3-3-5-8-3-7-1-15 5-20z" />
      <path d="M20 9v24" />
      <circle cx="17" cy="19" r="1.2" />
      <circle cx="23" cy="23" r="1.2" />
      <circle cx="17.5" cy="27" r="1.2" />
    </g>
  ),

  /* a honeycomb: the week, as a shape you aim at */
  honeycomb: (
    <g {...S}>
      <path d="M20 7l6 3.5v7L20 21l-6-3.5v-7z" />
      <path d="M12 21l6 3.5v7L12 35l-6-3.5v-7z" />
      <path d="M28 21l6 3.5v7L28 35l-6-3.5v-7z" />
    </g>
  ),

  /* a nib: narrow shoulders, the slit down the middle, the breather
     hole. Widen it and the whole thing reads as a kite. */
  nib: (
    <g {...S}>
      <path d="M15.5 9h9l1.5 13-6 11-6-11z" />
      <path d="M20 9V5" />
      <path d="M20 17v16" />
      <circle cx="20" cy="15" r="2" />
      <path d="M15 22h10" />
    </g>
  ),

  /* a constellation: the pattern only shows from a distance */
  constellation: (
    <g {...S}>
      <path d="M10 28l6-9 7 4 4-10 4 7" />
      <circle cx="10" cy="28" r="1.6" />
      <circle cx="16" cy="19" r="1.6" />
      <circle cx="23" cy="23" r="1.6" />
      <circle cx="27" cy="13" r="1.6" />
      <circle cx="31" cy="20" r="1.6" />
      <circle cx="14" cy="33" r="1" />
      <circle cx="33" cy="30" r="1" />
    </g>
  ),

  /* a lantern, because the coach carries a light, not a map */
  lantern: (
    <g {...S}>
      <path d="M20 6c0 2-3 2-3 4h6c0-2-3-2-3-4z" />
      <path d="M13 12h14l-1.5 18h-11z" />
      <path d="M13 12h14" />
      <path d="M20 17v8" />
      <path d="M11 34h18" />
    </g>
  ),

  /* a spiral shell: the week comes round again, wider */
  shell: (
    <g {...S}>
      <path d="M21 33c-7 0-12-5-12-11S13 10 20 10s11 5 11 10-4 8-8 8-6-2-6-5 2-4 4-4 3 1 3 3" />
    </g>
  ),

  /* a ring of keys, one per protocol */
  keys: (
    <g {...S}>
      <circle cx="16" cy="14" r="5" />
      <path d="M19 18l9 10M24 24l-2.5 2.5M27 27l-2.5 2.5" />
      <path d="M22 11c3-2 7-1 8 2" />
    </g>
  ),

  /* calipers: settings, which is where things get measured */
  calipers: (
    <g {...S}>
      <path d="M15 8v16M25 8v16" />
      <path d="M15 24l-3 9M25 24l3 9" />
      <path d="M12 14h16" />
      <circle cx="20" cy="14" r="1.6" />
    </g>
  ),
};

/**
 * Prints a plate twice: an under-pass offset by a hair and inked in a
 * second colour, then the drawing itself on top. On a real press that
 * gap is the paper shifting between passes.
 */
export function Plate({
  name,
  size = 40,
  under = "var(--spot)",
  className = "",
}: {
  name: keyof typeof PLATES | string;
  size?: number;
  under?: string;
  className?: string;
}) {
  const art = PLATES[name];
  if (!art) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ overflow: "visible" }}
    >
      <g
        transform="translate(1.6 1.6)"
        style={{ color: `rgb(${under} / 0.55)` }}
      >
        {art}
      </g>
      {art}
    </svg>
  );
}

/** Which plate belongs to which screen. */
export const PLATE_FOR: Record<string, string> = {
  "/": "leaf",
  "/morning": "sun",
  "/evening": "moth",
  "/focus": "hourglass",
  "/habits": "sprout",
  "/discipline": "trellis",
  "/quests": "mountain",
  "/compass": "compass",
  "/identity": "feather",
  "/future": "seedpod",
  "/week": "honeycomb",
  "/journal": "nib",
  "/insights": "constellation",
  "/coach": "lantern",
  "/weekly-review": "shell",
  "/protocols": "keys",
  "/settings": "calipers",
  "/pick-profile": "leaf",
};
