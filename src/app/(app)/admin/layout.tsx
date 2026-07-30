import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only gate when Supabase is connected; preview mode stays browsable.
  if (isSupabaseConfigured) {
    const profile = await getProfile();
    if (!profile || profile.role !== "admin") redirect("/learn");
  }
  return <>{children}</>;
}
