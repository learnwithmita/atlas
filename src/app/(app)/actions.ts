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

/** Student joins a classroom via its invite code. */
export async function joinClassroom(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean; name?: string }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter a class code." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_classroom", { p_code: code });
  if (error) return { error: error.message };
  revalidatePath("/learn");
  return { ok: true, name: data?.[0]?.name };
}

/** Records a completed assignment's score. */
export async function submitAssignment(
  assignmentId: string,
  score: number,
  maxScore: number
): Promise<{ error?: string; ok?: boolean }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("assignment_submissions").upsert({
    assignment_id: assignmentId,
    student_id: user.id,
    status: "submitted",
    score,
    max_score: maxScore,
    submitted_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  await supabase.rpc("touch_streak", { p_xp: 20, p_minutes: 5 });
  revalidatePath("/learn");
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
