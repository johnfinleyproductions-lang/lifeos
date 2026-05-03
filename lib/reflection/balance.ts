/**
 * The 6 balance dimensions used in the weekly review and the Today
 * Balance card. Default per spec; configurable later.
 */

export type BalanceDimensionKey =
  | "mind"
  | "body"
  | "work"
  | "relationships"
  | "play"
  | "spirit";

export const BALANCE_DIMENSIONS: {
  key: BalanceDimensionKey;
  label: string;
  blurb: string;
  accentClass: string;
}[] = [
  {
    key: "mind",
    label: "Mind",
    blurb: "Clarity, learning, focus.",
    accentClass: "bg-accent-violet",
  },
  {
    key: "body",
    label: "Body",
    blurb: "Sleep, movement, energy.",
    accentClass: "bg-accent-green",
  },
  {
    key: "work",
    label: "Work",
    blurb: "Output, craft, momentum.",
    accentClass: "bg-accent-sky",
  },
  {
    key: "relationships",
    label: "Relationships",
    blurb: "People you care about.",
    accentClass: "bg-accent-rose",
  },
  {
    key: "play",
    label: "Play",
    blurb: "Joy, fun, hobbies.",
    accentClass: "bg-accent-gold",
  },
  {
    key: "spirit",
    label: "Spirit",
    blurb: "Meaning, presence, depth.",
    accentClass: "bg-ink-300",
  },
];

export type BalanceScore = Record<BalanceDimensionKey, number>;

export const ZERO_BALANCE: BalanceScore = {
  mind: 0,
  body: 0,
  work: 0,
  relationships: 0,
  play: 0,
  spirit: 0,
};
