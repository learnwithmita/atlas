import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata = { title: "Reset password · Atlas" };

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink mb-1.5">
        Forgot your password?
      </h1>
      <p className="text-ink-2 mb-8">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>
      {expired && (
        <p className="text-sm text-danger mb-6 -mt-4">
          That reset link expired or was already used — request a fresh one
          below.
        </p>
      )}
      <ForgotForm />
    </>
  );
}
