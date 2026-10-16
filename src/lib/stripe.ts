import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

export const isStripeConfigured = SECRET.length > 0;

/** Server-only Stripe client. Never import into a client component.
 *  Uses the SDK's built-in pinned API version. A placeholder key is used when
 *  Stripe isn't configured yet so importing this module (e.g. during the build,
 *  or while billing is off) never throws — real calls are always guarded by
 *  `isStripeConfigured`, so the placeholder is never used to reach Stripe. */
export const stripe = new Stripe(SECRET || "sk_not_configured", {
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** Stripe Price IDs per tier + cycle (create these in the Stripe dashboard). */
export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "",
  },
} as const;

export type PaidPlanId = keyof typeof PRICE_IDS;

export function priceId(plan: PaidPlanId, cycle: "monthly" | "annual"): string {
  return PRICE_IDS[plan]?.[cycle] ?? "";
}

/** Map a Stripe Price ID back to its tier + cycle (for the webhook). */
export function planForPrice(
  priceId: string | null | undefined
): { plan: PaidPlanId; cycle: "monthly" | "annual" } | null {
  if (!priceId) return null;
  for (const plan of ["pro", "premium"] as const) {
    for (const cycle of ["monthly", "annual"] as const) {
      if (priceId === PRICE_IDS[plan][cycle]) return { plan, cycle };
    }
  }
  return null;
}

/** Billing cycle for a price (back-compat helper used by the webhook). */
export function cycleForPrice(priceId: string | null | undefined): "monthly" | "annual" | null {
  return planForPrice(priceId)?.cycle ?? null;
}
