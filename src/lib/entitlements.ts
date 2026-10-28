import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Billing switch. While OFF (the default, and how you run before Stripe is
 * wired), EVERYONE gets unlimited access so every feature is open for testing.
 * Flip BILLING_ENABLED=true on Vercel once Stripe + the webhook are live.
 */
export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

// The only thing that differs across tiers: how many answers you can have
// AI-marked per day (resets at midnight). Premium is unlimited.
export const FREE_DAILY_MARKS = Number(process.env.FREE_DAILY_MARKS ?? 5);
export const PRO_DAILY_MARKS = Number(process.env.PRO_DAILY_MARKS ?? 10);

export type Tier = "free" | "pro" | "premium";
export type Entitlement = {
  tier: Tier;
  /** Paid plan (pro or premium). Kept as `isPro` so existing gates read simply. */
  isPro: boolean;
  /** Max AI-marked answers per day; null = unlimited. */
  dailyMarkCap: number | null;
  periodEnd: string | null;
  reason: "billing_off" | "staff" | "active_sub" | "free";
};

function capFor(tier: Tier): number | null {
  if (tier === "premium") return null;
  if (tier === "pro") return PRO_DAILY_MARKS;
  return FREE_DAILY_MARKS;
}

/** Which paid tier a Stripe price belongs to (compared against the env IDs). */
function tierForPriceId(priceId: string | null | undefined): "pro" | "premium" {
  if (
    priceId &&
    (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY ||
      priceId === process.env.STRIPE_PRICE_PREMIUM_ANNUAL)
  ) {
    return "premium";
  }
  return "pro";
}

/**
 * The single source of truth for what the signed-in user may access. Call this
 * on the SERVER in every gated route/action — never trust the client.
 */
export async function getEntitlement(): Promise<Entitlement> {
  // Pre-launch / testing: everyone unlimited.
  if (!BILLING_ENABLED) {
    return { tier: "premium", isPro: true, dailyMarkCap: null, periodEnd: null, reason: "billing_off" };
  }
  if (!isSupabaseConfigured) {
    return { tier: "free", isPro: false, dailyMarkCap: capFor("free"), periodEnd: null, reason: "free" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tier: "free", isPro: false, dailyMarkCap: capFor("free"), periodEnd: null, reason: "free" };
  }

  // Staff always have unlimited access.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin" || profile?.role === "tutor") {
    return { tier: "premium", isPro: true, dailyMarkCap: null, periodEnd: null, reason: "staff" };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, status, period_end, price_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const paid = sub?.tier === "plus" || sub?.tier === "pro";
  const notExpired = !sub?.period_end || new Date(sub.period_end) > new Date();
  const live = sub?.status === "active" || sub?.status === "trialing";
  const active = !!sub && live && paid && notExpired;

  if (!active) {
    return { tier: "free", isPro: false, dailyMarkCap: capFor("free"), periodEnd: null, reason: "free" };
  }
  const tier = tierForPriceId(sub!.price_id);
  return { tier, isPro: true, dailyMarkCap: capFor(tier), periodEnd: sub!.period_end ?? null, reason: "active_sub" };
}

/**
 * Usage snapshot for the credits display. `cap === null` means unlimited
 * (Premium / staff / billing off); otherwise `remaining` counts down the daily cap.
 */
export async function getMarkUsage(): Promise<{
  tier: Tier;
  isPro: boolean;
  cap: number | null;
  used: number;
  remaining: number | null;
}> {
  const ent = await getEntitlement();
  if (ent.dailyMarkCap === null) {
    return { tier: ent.tier, isPro: ent.isPro, cap: null, used: 0, remaining: null };
  }
  const used = await marksUsedToday();
  return {
    tier: ent.tier,
    isPro: ent.isPro,
    cap: ent.dailyMarkCap,
    used,
    remaining: Math.max(0, ent.dailyMarkCap - used),
  };
}

/** How many answers the user has had AI-marked today (resets at midnight).
 * Counts the ai_mark_usage ledger (0029), which every billable marking path
 * writes to — so structured, open-ended and assignment marking all count. */
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
    .from("ai_mark_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

/**
 * Record one billable AI mark in the daily ledger. Best-effort: a failure here
 * must never block returning the student's result. Call after a successful AI
 * mark on every marking path so the daily cap counts consistently.
 */
export async function recordMark(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  kind: string
): Promise<void> {
  try {
    await supabase.from("ai_mark_usage").insert({ user_id: userId, kind });
  } catch {
    /* ledger write is best-effort; never block the student's result */
  }
}

/**
 * Gate for the AI-marking endpoints. Unlimited tiers always pass; capped tiers
 * pass until the daily limit, then return an upgrade nudge pointing at the next
 * tier up.
 */
export async function canMarkNow(): Promise<{ ok: boolean; reason?: string; isPro: boolean }> {
  const ent = await getEntitlement();
  if (ent.dailyMarkCap === null) return { ok: true, isPro: ent.isPro };
  const used = await marksUsedToday();
  if (used >= ent.dailyMarkCap) {
    const reason =
      ent.tier === "free"
        ? `You've used your ${ent.dailyMarkCap} free marked answers for today. Upgrade to Pro for ${PRO_DAILY_MARKS} a day — or Premium for unlimited.`
        : `You've used today's ${ent.dailyMarkCap} marked answers. Upgrade to Premium for unlimited marking.`;
    return { ok: false, isPro: ent.isPro, reason };
  }
  return { ok: true, isPro: ent.isPro };
}
