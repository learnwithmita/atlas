"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";

/** Fills the current user's dashboard with realistic sample progress. */
export async function seedDemoProgress() {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_demo_progress");
  if (error) return { error: error.message };
  revalidatePath("/learn");
  revalidatePath("/plan");
  return { ok: true };
}

/** Records a study action toward today's streak + XP. */
export async function recordActivity(xp = 10, minutes = 1) {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("touch_streak", {
    p_xp: xp,
    p_minutes: minutes,
  });
  if (error) return { error: error.message };
  revalidatePath("/learn");
  return { ok: true };
}
