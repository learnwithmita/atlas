import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { WelcomeTour } from "@/components/app/WelcomeTour";
import { getProfile } from "@/lib/data";
import { getMarkUsage } from "@/lib/entitlements";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, usage] = await Promise.all([getProfile(), getMarkUsage()]);

  // Fallback so the app is browsable before Supabase keys are added.
  const role = profile?.role ?? "student";
  const name = profile?.full_name ?? profile?.email ?? "Guest";
  const streak = profile?.current_streak ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} name={name} streak={streak} usage={usage} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav role={role} name={name} streak={streak} usage={usage} />
        <main className="flex-1">{children}</main>
      </div>
      {role === "student" && <WelcomeTour />}
    </div>
  );
}
