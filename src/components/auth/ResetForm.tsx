"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resetPassword, type AuthState } from "@/app/(auth)/actions";

const fieldWrap =
  "flex items-center gap-3 h-12 px-4 rounded-[14px] bg-surface-2 border border-hairline focus-within:border-accent focus-within:bg-surface transition-colors";
const input =
  "flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-3";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPassword,
    {}
  );
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className={fieldWrap}>
        <Lock size={18} className="text-ink-3" />
        <input
          name="password"
          type={show ? "text" : "password"}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          required
          className={input}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-ink-3 hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {state.error && <p className="text-sm text-danger px-1">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
