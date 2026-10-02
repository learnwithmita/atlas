import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET, cycleForPrice } from "@/lib/stripe";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";

// Stripe needs the raw body to verify the signature — don't let Next parse it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The ONLY writer of subscription access. Stripe calls this after real payment
 * events; we verify the signature, then upsert the user's subscription row.
 * Idempotent: every handler is a full upsert keyed by user_id, so Stripe's
 * automatic retries can't double-apply.
 */
export async function POST(req: Request) {
  if (!STRIPE_WEBHOOK_SECRET || !isServiceConfigured) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json(
      { error: `Signature check failed: ${e instanceof Error ? e.message : ""}` },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Write the full access state for one user. tier defaults to 'pro'.
  async function applyState(input: {
    userId: string;
    customerId: string | null;
    subscriptionId: string | null;
    priceId: string | null;
    status: string; // active | canceled | past_due | ...
    periodEnd: number | null; // unix seconds
    cancelAtPeriodEnd?: boolean;
  }) {
    const cycle = cycleForPrice(input.priceId);
    await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: input.userId,
          tier: input.status === "active" || input.status === "trialing" ? "pro" : "free",
          status: input.status,
          cycle,
          price_id: input.priceId,
          stripe_customer_id: input.customerId,
          stripe_subscription_id: input.subscriptionId,
          cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
          period_end: input.periodEnd ? new Date(input.periodEnd * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  }

  // Resolve our user id from the Stripe objects (set at checkout).
  function userIdFromSub(sub: Stripe.Subscription): string | null {
    return (sub.metadata?.user_id as string) ?? null;
  }

  // In recent Stripe API versions the billing period lives on each subscription
  // item rather than the subscription itself.
  function periodEndOf(sub: Stripe.Subscription): number | null {
    return sub.items?.data?.[0]?.current_period_end ?? null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = (s.client_reference_id as string) ?? (s.metadata?.user_id as string);
        if (userId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          await applyState({
            userId,
            customerId: (s.customer as string) ?? null,
            subscriptionId: sub.id,
            priceId: sub.items.data[0]?.price.id ?? null,
            status: sub.status,
            periodEnd: periodEndOf(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = userIdFromSub(sub);
        if (userId) {
          await applyState({
            userId,
            customerId: (sub.customer as string) ?? null,
            subscriptionId: sub.id,
            priceId: sub.items.data[0]?.price.id ?? null,
            status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
            periodEnd: periodEndOf(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
        break;
      }
      default:
        // Ignore everything else.
        break;
    }
  } catch (e) {
    // Return 500 so Stripe retries — but log for debugging.
    console.error("[stripe webhook] handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
