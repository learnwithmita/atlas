import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in · Atlas" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink mb-1.5">Welcome back</h1>
      <p className="text-ink-2 mb-8">Sign in to continue your progress.</p>
      <AuthForm mode="signin" />
    </>
  );
}
