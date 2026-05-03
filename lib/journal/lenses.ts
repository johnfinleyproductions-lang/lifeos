/**
 * The 12 mental-model lenses for Framework mode (Dickie Bush's framework).
 *
 * Each lens flips a journal entry into a structured decision-thinking
 * exercise. The user picks a lens, the editor surfaces the prompt + a
 * one-line description, and they write underneath it.
 */

export type Lens = {
  key: string;
  title: string;
  prompt: string;
  description: string;
};

export const LENSES: Lens[] = [
  {
    key: "bottleneck_analysis",
    title: "Bottleneck Analysis",
    prompt: "What's the actual constraint right now?",
    description:
      "Find the one thing that, if changed, makes everything else easier or unnecessary.",
  },
  {
    key: "regret_minimization",
    title: "Regret Minimization",
    prompt: "Will I regret not doing this in 10 years?",
    description: "Bezos's rule. Project yourself forward and look back.",
  },
  {
    key: "future_me_mentorship",
    title: "Future-Me Mentorship",
    prompt: "What would future-me, age 80, tell me to do?",
    description:
      "Wisdom from the version of you that already knows how this turns out.",
  },
  {
    key: "hell_yeah_or_no",
    title: "Hell Yeah or No",
    prompt: "Is this a 'hell yeah'? If not, it's a no.",
    description: "Derek Sivers's filter for protecting your yeses.",
  },
  {
    key: "inversion",
    title: "Inversion",
    prompt: "How would I guarantee failure here?",
    description:
      "Charlie Munger. List what would make this go wrong, then avoid those.",
  },
  {
    key: "buying_optionality",
    title: "Buying Optionality",
    prompt: "Does this buy or burn future options?",
    description:
      "Some choices open doors, others close them. Which is this?",
  },
  {
    key: "two_way_door",
    title: "Two-Way Door",
    prompt: "Is this reversible? How fast?",
    description:
      "Two-way doors deserve faster decisions than one-way doors.",
  },
  {
    key: "importance_x_urgency",
    title: "Importance × Urgency",
    prompt: "Where does this fall on the 2x2?",
    description:
      "Eisenhower matrix. Important + urgent gets done now; important + not urgent gets scheduled.",
  },
  {
    key: "cost_of_waiting",
    title: "Cost of Waiting",
    prompt: "What does delay actually cost?",
    description:
      "The cost is rarely zero. Sometimes it's the entire opportunity.",
  },
  {
    key: "new_information",
    title: "New Information",
    prompt: "What would have to be true to change my mind?",
    description: "Pre-commit to the evidence that would update your position.",
  },
  {
    key: "documentary_vs_horror",
    title: "Documentary vs Horror",
    prompt: "Am I imagining or remembering?",
    description:
      "Documentaries are based on what happened. Horror movies are made up. Most worry is horror.",
  },
  {
    key: "time_x_value",
    title: "Time × Value",
    prompt: "What's the highest value use of my next 90 minutes?",
    description: "Match your best hour to your most leveraged work.",
  },
];

export function getLens(key: string): Lens | undefined {
  return LENSES.find((l) => l.key === key);
}
