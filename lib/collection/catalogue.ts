/**
 * The catalogue: every specimen the collection can hold.
 *
 * A specimen is a first. The first morning manifesto, the first full
 * day, the hundredth time a habit was struck. It is recorded on the day
 * it happens and it carries that date for good, the way a pressed plant
 * carries its collection date on the label. Nothing here is a target
 * and nothing here can be lost: a specimen is a record of something
 * that has already happened.
 *
 * Which is why there is no specimen for a run of days. A run is a thing
 * you can break, and a broken run would turn a quiet record into a
 * penalty. Every entry below is either a first or a cumulative count at
 * whatever pace it came, so a week away costs nothing.
 *
 * `mark` is the field mark: how you would know one if you saw it. It is
 * worded as an observation, not an instruction.
 *
 * `countNoun` marks the specimens that keep counting after the first,
 * as a singular and a plural. The milestones (a hundred pressings, ten
 * hours) are one-time and carry only their date.
 *
 * A tally is kept only where the thing counted is a neutral quantity:
 * a pressing, an evening logged, an hour in the hide. Where the trigger
 * is a judgement, the tally goes. "A day marked alive" is earned by
 * rating an evening five of five, and a running count of fives would
 * turn the evening's "rate it from where you sit" into a score to
 * chase. It keeps its first date and nothing else.
 */

export type SpecimenFamily =
  | "rituals"
  | "habits"
  | "focus"
  | "quests"
  | "reflection";

export const FAMILIES: { key: SpecimenFamily; label: string; note: string }[] =
  [
    {
      key: "rituals",
      label: "The rituals",
      note: "mornings, evenings, and the days that had both",
    },
    { key: "habits", label: "Pressings", note: "every time a habit was struck" },
    { key: "focus", label: "The hide", note: "hours sat with one thing" },
    { key: "quests", label: "The range", note: "quests set and summits reached" },
    {
      key: "reflection",
      label: "Looking back",
      note: "reviews, protocols, and the file",
    },
  ];

export type Specimen = {
  key: string;
  family: SpecimenFamily;
  name: string;
  mark: string;
  plate: string;
  /** singular and plural, for the specimens that keep counting */
  countNoun?: [string, string];
};

export const CATALOGUE: Specimen[] = [
  // ---- the rituals ----
  {
    key: "morning",
    family: "rituals",
    name: "Morning manifesto",
    mark: "A morning manifesto, written and saved.",
    plate: "sun",
    countNoun: ["morning", "mornings"],
  },
  {
    key: "evening",
    family: "rituals",
    name: "Evening shutdown",
    mark: "An evening shutdown, logged.",
    plate: "moth",
    countNoun: ["evening", "evenings"],
  },
  {
    key: "fullday",
    family: "rituals",
    name: "Full day",
    mark: "Morning and evening logged on the same date.",
    plate: "disc",
    countNoun: ["full day", "full days"],
  },
  {
    key: "alive",
    family: "rituals",
    name: "A day marked alive",
    mark: "An evening rated five of five.",
    plate: "bloom",
    // no countNoun: the trigger is an opinion, so there is no tally
  },
  {
    key: "thirty-fulldays",
    family: "rituals",
    name: "Thirty full days",
    mark: "The thirtieth full day, at whatever pace it came.",
    plate: "sheaf",
  },

  // ---- pressings ----
  {
    key: "pressing",
    family: "habits",
    name: "First pressing",
    mark: "A habit struck and marked done.",
    plate: "sprout",
    countNoun: ["pressing", "pressings"],
  },
  {
    key: "hundred-pressings",
    family: "habits",
    name: "A hundred pressings",
    mark: "The hundredth time any habit was struck.",
    plate: "trellis",
  },
  {
    key: "thousand-pressings",
    family: "habits",
    name: "A thousand pressings",
    mark: "The thousandth. Most of a year of small things.",
    plate: "tree",
  },

  // ---- the hide ----
  {
    key: "long-sit",
    family: "focus",
    name: "Long sit",
    mark: "A single focus block of forty-five minutes or more.",
    plate: "hourglass",
    countNoun: ["long sit", "long sits"],
  },
  {
    key: "ten-hours",
    family: "focus",
    name: "Ten hours in the hide",
    mark: "Ten hours of focus logged, in total.",
    plate: "hide",
  },
  {
    key: "hundred-hours",
    family: "focus",
    name: "A hundred hours",
    mark: "A hundred hours of focus logged, in total.",
    plate: "glasses",
  },

  // ---- the range ----
  {
    key: "quest",
    family: "quests",
    name: "Quest set",
    mark: "A quarterly quest written down.",
    plate: "mountain",
    countNoun: ["quest", "quests"],
  },
  {
    key: "summit",
    family: "quests",
    name: "Summit",
    mark: "A quest marked done.",
    plate: "cairn",
    countNoun: ["summit", "summits"],
  },
  {
    key: "three-summits",
    family: "quests",
    name: "Three summits",
    mark: "The third quest finished.",
    plate: "flag",
  },

  // ---- looking back ----
  {
    key: "review",
    family: "reflection",
    name: "Weekly review",
    mark: "A weekly review run to the end.",
    plate: "shell",
    countNoun: ["review", "reviews"],
  },
  {
    key: "protocol",
    family: "reflection",
    name: "Protocol run",
    mark: "Any of the six protocols, run once.",
    plate: "keys",
    countNoun: ["run", "runs"],
  },
  {
    key: "full-set",
    family: "reflection",
    name: "The full set",
    mark: "All six protocols run at least once.",
    plate: "cabinet",
  },
  {
    key: "confidence",
    family: "reflection",
    name: "Confidence filed",
    mark: "An entry in the confidence file.",
    plate: "feather",
    countNoun: ["entry", "entries"],
  },
  {
    key: "compass",
    family: "reflection",
    name: "Compass set",
    mark: "A mission written on the compass.",
    plate: "compass",
  },
];

export const CATALOGUE_BY_KEY: Record<string, Specimen> = Object.fromEntries(
  CATALOGUE.map((s) => [s.key, s]),
);
