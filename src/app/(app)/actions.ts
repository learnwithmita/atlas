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

/** Save a student's personal notes for a topic. */
export async function saveStudentNotes(
  topicId: string,
  content: string
): Promise<{ error?: string; ok?: boolean }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("student_notes").upsert({
    student_id: user.id,
    topic_id: topicId,
    content,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Spaced-repetition review (SM-2 lite). grade: again | hard | good | easy. */
export async function reviewFlashcard(
  flashcardId: string,
  grade: "again" | "hard" | "good" | "easy"
): Promise<{ error?: string; ok?: boolean }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("flashcard_reviews")
    .select("ease, interval_days, reps")
    .eq("student_id", user.id)
    .eq("flashcard_id", flashcardId)
    .maybeSingle();

  let ease = Number(existing?.ease ?? 2.5);
  let interval = Number(existing?.interval_days ?? 0);
  let reps = Number(existing?.reps ?? 0);

  switch (grade) {
    case "again":
      reps = 0;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
      break;
    case "hard":
      reps += 1;
      interval = interval < 1 ? 1 : Math.round(interval * 1.2);
      ease = Math.max(1.3, ease - 0.15);
      break;
    case "good":
      reps += 1;
      interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
      break;
    case "easy":
      reps += 1;
      interval = reps === 1 ? 3 : Math.round(interval * ease * 1.3);
      ease += 0.15;
      break;
  }
  const dueAt = new Date(Date.now() + interval * 86400000).toISOString();

  const { error } = await supabase.from("flashcard_reviews").upsert({
    student_id: user.id,
    flashcard_id: flashcardId,
    ease,
    interval_days: interval,
    reps,
    due_at: dueAt,
    last_reviewed: new Date().toISOString(),
  });
  if (error) return { error: error.message };
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
