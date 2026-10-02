import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Billing switch. While OFF (the default, and how you run before Stripe is
 * wired), EVERYONE is treated as Pro so every feature is open for testing.
 * Flip BILLING_ENABLED=true on Vercel once Stripe + the webhook are live and
 * the paywall should start enforcing.
 */
export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

/** Free tier gets this many AI-marked answers per day. Pro is unlimited. */
export const FREE_DAILY_MARKS = Number(process.env.FREE_DAILY_MARKS ?? 10);

export type Tier = "free" | "pro";
export type Entitlement = {
  tier: Tier;
  isPro: boolean;
  periodEnd: string | null;
  /** Why they're Pro — useful for UI copy and debugging. */
  reason: "billing_off" | "staff" | "active_sub" | "free";
};

const PRO: Entitlement = { tier: "pro", isPro: true, periodEnd: null, reason: "billing_off" };
const FREE: Entitlement = { tier: "free", isPro: false, periodEnd: null, reason: "free" };

/**
 * The single source of truth for what the signed-in user may access. Call this
 * on the SERVER in every gated route/action — never trust the client. Reads
 * status + period_end written by the Stripe webhook (the only writer).
 */
export async function getEntitlement(): Promise<Entitlement> {
  if (!BILLING_ENABLED) return PRO; // pre-launch / testing: all features open
  if (!isSupabaseConfigured) return FREE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE;

  // Staff always have full access.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin" || profile?.role === "tutor") {
    return { ...PRO, reason: "staff" };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, status, period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const paid = sub?.tier === "plus" || sub?.tier === "pro";
  const notExpired = !sub?.period_end || new Date(sub.period_end) > new Date();
  const active = !!sub && sub.status === "active" && paid && notExpired;

  return active
    ? { tier: "pro", isPro: true, periodEnd: sub!.period_end ?? null, reason: "active_sub" }
    : FREE;
}

/** How many answers the student has had AI-marked today (for the free cap). */
export async function marksUsedToday(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("practice_log")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/**
 * Gate for the AI-marking endpoints. Pro → always allowed. Free → allowed until
 * the daily cap is hit. Returns a reason the caller surfaces as an upgrade nudge.
 */
export async function canMarkNow(): Promise<{ ok: boolean; reason?: string; isPro: boolean }> {
  const ent = await getEntitlement();
  if (ent.isPro) return { ok: true, isPro: true };
  const used = await marksUsedToday();
  if (used >= FREE_DAILY_MARKS) {
    return {
      ok: false,
      isPro: false,
      reason: `You've used your ${FREE_DAILY_MARKS} free marked answers for today. Upgrade to Pro for unlimited marking.`,
    };
  }
  return { ok: true, isPro: false };
}
