export type Plan = {
  id: "free" | "pro";
  name: string;
  tagline: string;
  monthly: number; // SGD
  annual: number; // SGD per year
  features: string[];
  highlight?: boolean;
};

// Two tiers only — a single, obvious upgrade decision converts far better than
// a 3-way choice. Prices in SGD. Adjust here and in your Stripe dashboard
// together (the Stripe Price IDs are what actually charge the card).
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Find your gaps",
    monthly: 0,
    annual: 0,
    features: [
      "Diagnostic + mastery map",
      "Practice from the question bank",
      "Up to 10 AI-marked answers a day",
      "Flashcards & fill-the-blanks",
      "Adaptive study plan",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Study like it's your tutor",
    monthly: 15,
    annual: 108, // ~S$9/mo — 40% off monthly
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited mark-scheme marking",
      "Build custom WA papers from any topics",
      "Priority support from your tutor",
    ],
  },
];

export function priceFor(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : plan.annual;
}

export function perMonth(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : Math.round(plan.annual / 12);
}
