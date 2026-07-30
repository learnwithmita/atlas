"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * TEMPORARY checkout. No real payment is processed — this records the chosen
 * tier so the app reflects it. Swap for Stripe Checkout later.
 */
export async function completeCheckout(
  tier: "plus" | "pro",
  cycle: "monthly" | "annual"
): Promise<{ ok?: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    // Preview mode — pretend success so the flow is demoable.
    return { ok: true };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  const periodEnd = new Date();
  if (cycle === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    tier,
    cycle,
    status: "active",
    period_end: periodEnd.toISOString(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}
