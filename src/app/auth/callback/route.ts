import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from Supabase email links (password recovery and email
 * confirmation). Exchanges the one-time code/token for a session cookie, then
 * forwards the user on to `next` (defaults to the dashboard).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/learn";

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, url.origin));

  // Couldn't establish a session — send them somewhere sensible with a hint.
  const dest = next === "/reset" ? "/forgot?expired=1" : "/login?error=link";
  return NextResponse.redirect(new URL(dest, url.origin));
}
