import { Logo } from "@/components/Logo";
import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden bg-ink-static">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 120% at 15% 10%, #2a2a52 0%, #0f0f1e 55%, #000 100%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5 text-white">
          <Logo href="/" />
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-semibold text-white leading-tight tracking-tight">
            The tutor that knows your syllabus by heart.
          </h2>
          <p className="mt-5 text-lg text-white/60 leading-relaxed">
            Atlas marks like an SEAB examiner, remembers every mistake you make,
            and turns it into tomorrow&apos;s study plan.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/40">
          Biology & Chemistry · Built for Singapore secondary schools
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden mb-8">
            <Logo href="/" />
          </div>
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
