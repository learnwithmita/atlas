import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Fixed-window rate limit backed by the check_rate_limit RPC (migration 0030),
 * so it works across stateless serverless instances. Returns true when the
 * action is ALLOWED, false when the window's limit is exceeded.
 *
 * Fails OPEN: if the limiter errors (or the migration isn't applied yet), it
 * allows the action rather than locking real users out. Security-critical
 * limits still back onto other controls (Supabase's own auth limits, the daily
 * mark cap), so a brief limiter outage degrades gracefully.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open
    return data === true;
  } catch {
    return true; // fail open
  }
}

/** Best-effort client IP from proxy headers, for keying anonymous limits. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
