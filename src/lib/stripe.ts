import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

export const isStripeConfigured = SECRET.length > 0;

/** Server-only Stripe client. Never import into a client component.
 *  Uses the SDK's built-in pinned API version. */
export const stripe = new Stripe(SECRET, { typescript: true });

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** Stripe Price IDs (create these in the Stripe dashboard → Products). */
export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
};

/** Map a Stripe Price ID back to our billing cycle (for the webhook). */
export function cycleForPrice(priceId: string | null | undefined): "monthly" | "annual" | null {
  if (!priceId) return null;
  if (priceId === PRICE_IDS.monthly) return "monthly";
  if (priceId === PRICE_IDS.annual) return "annual";
  return null;
}
