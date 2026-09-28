import { getProfile } from "@/lib/data";
import { AccountForm } from "@/components/app/AccountForm";

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
    </div>
  );
}
