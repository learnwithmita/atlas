"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const fieldWrap =
  "flex items-center gap-3 h-12 px-4 rounded-[14px] bg-surface-2 border border-hairline focus-within:border-accent focus-within:bg-surface transition-colors";
const input =
  "flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-3";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const action = isSignup ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {}
  );
  const [show, setShow] = useState(false);
  const [role, setRole] = useState("student");
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {isSignup && (
        <>
          <div className={fieldWrap}>
            <User size={18} className="text-ink-3" />
            <input
              name="full_name"
              placeholder="Full name"
              autoComplete="name"
              required
              className={input}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-ink-3 mb-2 px-1">I am a…</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "student", label: "Student" },
                { v: "tutor", label: "Tutor" },
                { v: "admin", label: "Admin" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setRole(o.v)}
                  className={cn(
                    "h-10 rounded-[12px] text-sm font-medium border transition-all",
                    role === o.v
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-surface-2 text-ink-2 border-hairline hover:text-ink"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>
        </>
      )}

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

      <div className={fieldWrap}>
        <Lock size={18} className="text-ink-3" />
        <input
          name="password"
          type={show ? "text" : "password"}
          placeholder="Password"
          autoComplete={isSignup ? "new-password" : "current-password"}
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

      {state.error && (
        <p className="text-sm text-danger px-1">{state.error}</p>
      )}
      {state.message && (
        <p className="text-sm text-accent px-1">{state.message}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
      </Button>

      <div className="flex items-center justify-between text-sm pt-1">
        <span className="text-ink-3">
          {isSignup ? "Already have an account?" : "New to Atlas?"}
        </span>
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-accent hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </div>

      <p className="text-center text-xs text-ink-3 pt-2">
        Two-factor authentication coming soon.
      </p>
    </form>
  );
}
