"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export type AuthState = { error?: string; message?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn't connected yet. Add your keys to .env.local and restart." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Route by role.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let dest = next || "/learn";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") dest = "/admin";
    else if (profile?.role === "tutor") dest = "/teach";
  }
  redirect(dest);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn't connected yet. Add your keys to .env.local and restart." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  // Public signup may only create students or tutors. Admins are promoted
  // manually (SQL) — never self-assigned, since admin RLS reads all data.
  const requested = String(formData.get("role") ?? "student");
  const role = requested === "tutor" ? "tutor" : "student";

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) return { error: error.message };

  // If email confirmation is on, there's no session yet.
  if (!data.session) {
    return {
      message:
        "Account created. Check your email to confirm, then sign in. (Tip: for testing, disable email confirmation in Supabase → Auth → Providers → Email.)",
    };
  }
  redirect(role === "tutor" ? "/teach" : "/learn");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
