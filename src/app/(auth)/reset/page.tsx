import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = { title: "Set a new password · Atlas" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink mb-1.5">
        Set a new password
      </h1>
      <p className="text-ink-2 mb-8">
        Pick something you&apos;ll remember. You&apos;ll be signed in right
        after.
      </p>
      <ResetForm />
    </>
  );
}
