"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";

const fieldWrap =
  "flex items-center gap-3 h-12 px-4 rounded-[14px] bg-surface-2 border border-hairline focus-within:border-accent focus-within:bg-surface transition-colors";
const input =
  "flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-3";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className={fieldWrap}>
        <Mail size={18} className="text-ink-3" />
        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          className={input}
        />
      </div>

      {state.error && <p className="text-sm text-danger px-1">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-accent px-1">{state.message}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <div className="flex items-center justify-between text-sm pt-1">
        <span className="text-ink-3">Remembered it?</span>
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
