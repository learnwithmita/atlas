export type Plan = {
  id: "free" | "plus" | "pro";
  name: string;
  tagline: string;
  monthly: number; // SGD
  annual: number; // SGD per year
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Find your gaps",
    monthly: 0,
    annual: 0,
    features: [
      "Diagnostic + mastery map",
      "5 practice questions a day",
      "AI tutor (20 messages/day)",
      "Daily streak & goals",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Study like it's your tutor",
    monthly: 18,
    annual: 144,
    highlight: true,
    features: [
      "Unlimited practice + examiner marking",
      "Full adaptive study plan",
      "Unlimited AI tutor",
      "Weekly progress report",
      "Predicted grade tracking",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Everything, exam-ready",
    monthly: 34,
    annual: 288,
    features: [
      "Everything in Plus",
      "Scan & mark handwritten work",
      "Timed mock-exam modes",
      "Likely-exam-question predictions",
      "Priority AI (fastest models)",
    ],
  },
];

export function priceFor(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : plan.annual;
}

export function perMonth(plan: Plan, cycle: "monthly" | "annual") {
  return cycle === "monthly" ? plan.monthly : Math.round(plan.annual / 12);
}
