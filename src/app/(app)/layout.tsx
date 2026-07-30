import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { getProfile } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  // Fallback so the app is browsable before Supabase keys are added.
  const role = profile?.role ?? "student";
  const name = profile?.full_name ?? profile?.email ?? "Guest";
  const streak = profile?.current_streak ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} name={name} streak={streak} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav role={role} name={name} streak={streak} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
