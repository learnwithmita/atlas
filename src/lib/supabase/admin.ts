import { createClient as createJsClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isServiceConfigured =
  SUPABASE_URL.length > 0 && SERVICE_KEY.length > 0;

/**
 * Service-role Supabase client — BYPASSES Row-Level Security. Server-only.
 * Use only for trusted writes the app fully controls, e.g. writing
 * AI-generated questions to the shared question bank on a student's behalf.
 * Never import into client components; never expose the key.
 */
export function createServiceClient() {
  return createJsClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
