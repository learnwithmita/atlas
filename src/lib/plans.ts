export type Plan = {
  id: "free" | "pro" | "premium";
  name: string;
  tagline: string;
  monthly: number; // SGD
  annual: number; // SGD per year
  features: string[];
  highlight?: boolean;
};

// Three tiers — Free / Pro / Premium. Pro is the one most people should land on;
// Premium is priced ~2x to anchor Pro as the sensible middle choice, and adds
// the human, tutor-delivered layer (not app features we don't have). Prices in
// SGD. Change here AND in your Stripe dashboard together (Stripe Price IDs are
// what actually charge the card).
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
    monthly: 39,
    annual: 415,
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited mark-scheme marking — no daily limit",
      "Build custom WA papers from any topics",
      "Review every past answer & its feedback",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Exam-ready, tutor-guided",
    monthly: 79,
    annual: 840,
    features: [
      "Everything in Pro",
      "Monthly progress report from your tutor",
      "Priority support — your questions answered first",
      "Exam-season revision pack",
      "Early access to new subjects & topics",
    ],
  },
];

export function priceFor(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : plan.annual;
}

export function perMonth(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : Math.round(plan.annual / 12);
}

/** Annual saving vs paying monthly, as a whole-number %. */
export function annualSavingPct(plan: Plan): number {
  if (!plan.monthly || !plan.annual) return 0;
  return Math.round((1 - plan.annual / (plan.monthly * 12)) * 100);
}
