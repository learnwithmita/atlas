"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { BILLING_ENABLED } from "@/lib/entitlements";
import { isStripeConfigured, stripe, PRICE_IDS } from "@/lib/stripe";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Start a real Stripe Checkout Session and return its URL for the browser to
 * redirect to. The subscription is only granted later by the webhook, after
 * Stripe confirms payment — the client can never grant itself a tier.
 */
export async function startCheckout(
  cycle: "monthly" | "annual"
): Promise<{ url?: string; error?: string }> {
  if (!BILLING_ENABLED) {
    return { error: "Checkout isn't live yet — you already have full access during early access." };
  }
  if (!isStripeConfigured) return { error: "Payments aren't configured yet." };
  if (!isSupabaseConfigured) return { error: "Please sign in first." };

  const price = PRICE_IDS[cycle];
  if (!price) return { error: "That plan isn't available yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  // Reuse an existing Stripe customer for this user if we have one.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId: string | undefined = sub?.stripe_customer_id ?? undefined;

  const origin = await siteOrigin();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : user.email ?? undefined,
      // Tie the Stripe objects back to our user — the webhook reads this.
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });
    return { url: session.url ?? undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't start checkout." };
  }
}

/**
 * Open the Stripe Billing Portal so a subscriber can update their card or
 * cancel. We look up the customer id (written by the webhook) with the service
 * client so RLS can't hide it.
 */
export async function startBillingPortal(): Promise<{ url?: string; error?: string }> {
  if (!isStripeConfigured || !isServiceConfigured) {
    return { error: "Billing isn't configured yet." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  const admin = createServiceClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) {
    return { error: "No billing account yet — subscribe first." };
  }

  const origin = await siteOrigin();
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/account`,
    });
    return { url: portal.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't open billing." };
  }
}
