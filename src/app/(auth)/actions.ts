"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type AuthState = { error?: string; message?: string };

/** Best-effort origin (scheme + host) for building absolute redirect URLs. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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

  // Student subject selection + level (ignored for tutors).
  let studySubjects: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("study_subjects") ?? "[]"));
    if (Array.isArray(parsed)) {
      studySubjects = parsed
        .map((s) => String(s))
        .filter((s) => ["combined", "biology", "chemistry"].includes(s));
    }
  } catch {
    studySubjects = [];
  }
  const level = String(formData.get("level") ?? "G3");

  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }
  if (role === "student" && studySubjects.length === 0) {
    return { error: "Pick at least one subject you're studying." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        ...(role === "student"
          ? { study_subjects: studySubjects, level }
          : {}),
      },
    },
  });
  if (error) return { error: error.message };

  // The DB trigger reads the metadata above, but also write the profile row
  // directly when we have a session — so the choice lands even if the trigger
  // predates migration 0023. Best-effort; ignore if the column isn't there yet.
  if (data.session && role === "student") {
    try {
      await supabase
        .from("profiles")
        .update({ study_subjects: studySubjects, level })
        .eq("id", data.user?.id ?? "");
    } catch {
      // onboarding prompt will catch it in-app
    }
  }

  // If email confirmation is on, there's no session yet.
  if (!data.session) {
    return {
      message:
        "Account created. Check your email to confirm, then sign in. (Tip: for testing, disable email confirmation in Supabase → Auth → Providers → Email.)",
    };
  }
  redirect(role === "tutor" ? "/teach" : "/learn");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn't connected yet. Add your keys to .env.local and restart." };
  }
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email you signed up with." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset`,
  });
  // Don't reveal whether an account exists — always confirm.
  if (error && !/rate limit/i.test(error.message)) {
    return { error: error.message };
  }
  return {
    message:
      "If an account exists for that email, a reset link is on its way. Check your inbox (and spam).",
  };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn't connected yet." };
  }
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "This reset link has expired or was already used. Request a new one from Forgot password.",
    };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/learn");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
