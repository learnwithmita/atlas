"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";

function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * Create an assignment from selected extracted questions, snapshotting them so
 * they're decoupled from the source paper.
 */
export async function createAssignment(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const title = String(formData.get("title") ?? "").trim();
  const classroomId = String(formData.get("classroom_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const dueAt = String(formData.get("due_at") ?? "");
  const questionIds = formData.getAll("qid").map(String).filter(Boolean);

  if (!title) return { error: "Give the assignment a title." };
  if (!classroomId) return { error: "Pick a class." };
  if (questionIds.length === 0) return { error: "Select at least one question." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  // Snapshot source questions (RLS ensures the tutor owns them).
  const { data: sourceQs } = await supabase
    .from("extracted_questions")
    .select("stem, marks, type, command_words, topic_id")
    .in("id", questionIds);
  if (!sourceQs || sourceQs.length === 0) {
    return { error: "Couldn't load the selected questions." };
  }

  const { data: assignment, error: aErr } = await supabase
    .from("assignments")
    .insert({
      tutor_id: user.id,
      title,
      classroom_id: classroomId,
      student_id: studentId || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    })
    .select("id")
    .single();
  if (aErr || !assignment) return { error: aErr?.message ?? "Failed to create." };

  const rows = sourceQs.map((q, i) => ({
    assignment_id: assignment.id,
    stem: q.stem,
    marks: q.marks,
    type: q.type,
    command_words: q.command_words ?? [],
    topic_id: q.topic_id,
    sort_order: i,
  }));
  const { error: qErr } = await supabase.from("assignment_questions").insert(rows);
  if (qErr) return { error: qErr.message };

  revalidatePath("/teach");
  return { ok: true };
}

export async function createClassroom(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  if (!isSupabaseConfigured) return { error: "Supabase not connected." };
  const name = String(formData.get("name") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "");
  if (!name) return { error: "Give the class a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { error } = await supabase.from("classrooms").insert({
    tutor_id: user.id,
    name,
    subject_id: subjectId || null,
    invite_code: inviteCode(),
    academic_year: String(new Date().getFullYear()),
  });
  if (error) return { error: error.message };
  revalidatePath("/teach");
  return { ok: true };
}
