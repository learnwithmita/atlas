import { getProfile } from "@/lib/data";
import { AccountForm } from "@/components/app/AccountForm";
import { SubjectSetup } from "@/components/dashboard/SubjectSetup";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Account · Atlas" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getProfile();
  const name = profile?.full_name ?? "";
  const email = profile?.email ?? "";
  const role = (profile?.role ?? "student") as "student" | "tutor" | "admin";

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">Account</h1>
        <p className="text-ink-2 mt-1">Manage your profile, password and sign-out.</p>
      </header>
      <AccountForm name={name} email={email} role={role} />

      {role === "student" && (
        <Card className="p-6 mt-4">
          <h2 className="font-semibold text-ink mb-1">My subjects</h2>
          <p className="text-sm text-ink-3 mb-4">
            Atlas only shows the syllabus for what you pick here.
          </p>
          <SubjectSetup
            compact
            initial={profile?.study_subjects ?? []}
            initialLevel={profile?.level ?? "G3"}
          />
        </Card>
      )}
    </div>
  );
}
