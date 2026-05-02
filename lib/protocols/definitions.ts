/**
 * The 9 MIND OS protocols + their prompt scripts.
 *
 * Each protocol is a small data structure: title, subtitle, description,
 * accent color, prompt sequence. The runner UI is generic — it walks the
 * prompts in order and submits the responses as a jsonb payload.
 *
 * If you change a prompt id, old runs will still parse since payload is
 * untyped jsonb. Just don't re-use the same id for a different question.
 */

export type ProtocolPromptType = "text" | "multiline";

export type ProtocolPrompt = {
  id: string;
  type: ProtocolPromptType;
  label: string;
  subhead?: string;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
};

export type ProtocolAccent = "green" | "violet" | "rose" | "gold" | "sky";

export type Protocol = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  accent: ProtocolAccent;
  estimatedMinutes: number;
  prompts: ProtocolPrompt[];
};

export const PROTOCOLS: Protocol[] = [
  {
    slug: "inner_audit",
    title: "Inner Audit",
    subtitle: "Get honest about how the day's been going.",
    description:
      "A 3-minute observer-shift. Step out, look back, name what's actually true.",
    accent: "violet",
    estimatedMinutes: 3,
    prompts: [
      {
        id: "truth",
        type: "multiline",
        label: "What's the truth right now?",
        subhead: "No editing. Just a raw read.",
        maxLength: 500,
      },
      {
        id: "avoiding",
        type: "multiline",
        label: "What am I avoiding?",
        subhead: "The thing you're not saying.",
        maxLength: 500,
      },
      {
        id: "needed",
        type: "text",
        label: "One thing I actually need.",
        placeholder: "e.g. a walk, sleep, to send the email",
        maxLength: 200,
      },
    ],
  },
  {
    slug: "daily_confidence",
    title: "Daily Confidence",
    subtitle: "Capture the day's evidence.",
    description:
      "Three short prompts that prove who you're becoming. The first answer auto-saves to your confidence file.",
    accent: "green",
    estimatedMinutes: 2,
    prompts: [
      {
        id: "proof",
        type: "multiline",
        label: "What did you do today that proves who you're becoming?",
        maxLength: 280,
      },
      {
        id: "despite",
        type: "text",
        label: "One small thing you did despite resistance.",
        maxLength: 200,
      },
      {
        id: "future_self",
        type: "text",
        label: "One thing future-you will be glad past-you did.",
        maxLength: 200,
      },
    ],
  },
  {
    slug: "brain_dump",
    title: "Brain Dump",
    subtitle: "Get the static out of your head.",
    description:
      "5 minutes of unfiltered writing. Then sort what came out into trash, action, reference, or waiting.",
    accent: "sky",
    estimatedMinutes: 7,
    prompts: [
      {
        id: "raw",
        type: "multiline",
        label: "Write everything in your head.",
        subhead: "Don't edit. Don't filter. Until it's all on the page.",
        maxLength: 4000,
      },
      {
        id: "sort",
        type: "multiline",
        label:
          "Now sort: what's trash, action, reference, or waiting on someone else?",
        subhead: "One line per item.",
        optional: true,
        maxLength: 2000,
      },
    ],
  },
  {
    slug: "sunday_alignment",
    title: "Sunday Alignment",
    subtitle: "Weekly check-in on what's working.",
    description:
      "End-of-week reflection across quests, balance, and what next week needs.",
    accent: "gold",
    estimatedMinutes: 10,
    prompts: [
      {
        id: "wins",
        type: "multiline",
        label: "Three wins from this week.",
        subhead: "Specific. Tiny is fine.",
        maxLength: 600,
      },
      {
        id: "drains",
        type: "multiline",
        label: "What drained you?",
        subhead: "And what's the pattern underneath it?",
        maxLength: 600,
      },
      {
        id: "next_week_feel",
        type: "text",
        label: "What do you want next week to feel like?",
        maxLength: 200,
      },
      {
        id: "one_thing",
        type: "text",
        label: "If only one thing happened next week, what would it be?",
        maxLength: 200,
      },
    ],
  },
  {
    slug: "loop_breaker",
    title: "Loop Breaker",
    subtitle: "Cut a thought loop you're stuck in.",
    description:
      "Run this when you can't stop replaying a thing. Names it, reframes it, gives you a physical interrupt.",
    accent: "rose",
    estimatedMinutes: 4,
    prompts: [
      {
        id: "loop",
        type: "text",
        label: "Name the loop.",
        placeholder: "Whatever's been replaying.",
        maxLength: 200,
      },
      {
        id: "story",
        type: "multiline",
        label: "What's the story you're telling yourself?",
        maxLength: 500,
      },
      {
        id: "truer",
        type: "multiline",
        label: "What's the truer story?",
        subhead: "The one you'd tell a friend in the same spot.",
        maxLength: 500,
      },
      {
        id: "interrupt",
        type: "text",
        label: "One physical action to break the loop now.",
        placeholder: "e.g. cold water, walk around the block, push-ups",
        maxLength: 200,
      },
    ],
  },
  {
    slug: "gratitude",
    title: "Gratitude",
    subtitle: "Three thanks. Anchored.",
    description:
      "Daily 90-second pass. Pin one to a person, one to a place, one to a moment.",
    accent: "gold",
    estimatedMinutes: 2,
    prompts: [
      {
        id: "person",
        type: "text",
        label: "A person you're grateful for today.",
        subhead: "Why?",
        maxLength: 200,
      },
      {
        id: "place",
        type: "text",
        label: "A place you're grateful for today.",
        maxLength: 200,
      },
      {
        id: "moment",
        type: "multiline",
        label: "A moment you're grateful for today.",
        subhead: "Specific beats grand.",
        maxLength: 280,
      },
    ],
  },
  {
    slug: "future_letter",
    title: "Future Letter",
    subtitle: "A letter to you, five years from now.",
    description:
      "Long-arc identity work. Where will you be? What did you become? What can you let go now?",
    accent: "violet",
    estimatedMinutes: 15,
    prompts: [
      {
        id: "who",
        type: "multiline",
        label: "Future me — who did you become?",
        subhead: "Not what you achieved. Who you ARE now.",
        maxLength: 1500,
      },
      {
        id: "let_go",
        type: "multiline",
        label: "What did you let go of along the way?",
        maxLength: 1000,
      },
      {
        id: "to_present",
        type: "multiline",
        label: "What would you tell present-me, today?",
        subhead: "The one thing you most want me to hear.",
        maxLength: 1000,
      },
    ],
  },
  {
    slug: "habit_architecture",
    title: "Habit Architecture",
    subtitle: "Design a new habit using stack-anchor-reward-protection.",
    description:
      "Use this when starting a habit you actually want to keep. The four legs that make it stick.",
    accent: "green",
    estimatedMinutes: 5,
    prompts: [
      {
        id: "habit",
        type: "text",
        label: "The habit, smallest version.",
        placeholder: "e.g. read 1 page",
        maxLength: 120,
      },
      {
        id: "stack",
        type: "text",
        label: "Stack anchor: after I do X, I will Y.",
        subhead: "What existing routine triggers it?",
        maxLength: 200,
      },
      {
        id: "reward",
        type: "text",
        label: "Small celebration when you do it.",
        placeholder: "e.g. coffee, a check on the calendar",
        maxLength: 120,
      },
      {
        id: "protection",
        type: "multiline",
        label: "What protects this habit when life gets messy?",
        subhead: "The 'even on a bad day' version of it.",
        maxLength: 280,
      },
    ],
  },
  {
    slug: "deep_reflection",
    title: "Deep Reflection",
    subtitle: "Quarterly identity dive.",
    description:
      "Run this 1-2 times per quarter. The hardest, slowest, most useful protocol.",
    accent: "rose",
    estimatedMinutes: 25,
    prompts: [
      {
        id: "patterns",
        type: "multiline",
        label: "What patterns are you noticing in yourself?",
        subhead:
          "In how you start, in how you avoid, in what energizes you.",
        maxLength: 1500,
      },
      {
        id: "shedding",
        type: "multiline",
        label: "What identity are you shedding?",
        subhead: "The version of you that no longer fits.",
        maxLength: 1000,
      },
      {
        id: "becoming",
        type: "multiline",
        label: "What identity are you growing into?",
        subhead: "Don't list goals. Describe the person.",
        maxLength: 1000,
      },
      {
        id: "afraid",
        type: "multiline",
        label: "What are you afraid to admit?",
        subhead:
          "Whisper-quiet. The thing you'd rather not say even here.",
        maxLength: 1000,
      },
    ],
  },
];

export function getProtocol(slug: string): Protocol | undefined {
  return PROTOCOLS.find((p) => p.slug === slug);
}

/**
 * Tailwind-safe accent class lookups. Tailwind only includes classes it
 * sees as static strings at build time, so we can't compose them as
 * `text-accent-${color}` — must be a literal map.
 */
export const ACCENT_TEXT: Record<ProtocolAccent, string> = {
  green: "text-accent-green",
  violet: "text-accent-violet",
  rose: "text-accent-rose",
  gold: "text-accent-gold",
  sky: "text-accent-sky",
};

export const ACCENT_BG: Record<ProtocolAccent, string> = {
  green: "bg-accent-green/10",
  violet: "bg-accent-violet/10",
  rose: "bg-accent-rose/10",
  gold: "bg-accent-gold/10",
  sky: "bg-accent-sky/10",
};

export const ACCENT_BORDER: Record<ProtocolAccent, string> = {
  green: "border-accent-green/30",
  violet: "border-accent-violet/30",
  rose: "border-accent-rose/30",
  gold: "border-accent-gold/30",
  sky: "border-accent-sky/30",
};

export const ACCENT_BAR: Record<ProtocolAccent, string> = {
  green: "bg-accent-green",
  violet: "bg-accent-violet",
  rose: "bg-accent-rose",
  gold: "bg-accent-gold",
  sky: "bg-accent-sky",
};
