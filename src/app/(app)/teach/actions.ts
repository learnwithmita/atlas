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
