import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create account · Atlas" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink mb-1.5">
        Start with Atlas
      </h1>
      <p className="text-ink-2 mb-8">
        Free to begin. No card required.
      </p>
      <AuthForm mode="signup" />
    </>
  );
}
