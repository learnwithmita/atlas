import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured) {
    const profile = await getProfile();
    if (!profile) redirect("/login");
    if (profile.role === "student") redirect("/learn");
    // tutors and admins may view the teaching workspace
  }
  return <>{children}</>;
}
