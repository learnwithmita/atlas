"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
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
  const [subjects, setSubjects] = useState<string[]>([]);
  const [level, setLevel] = useState("G3");
  const next = useSearchParams().get("next") ?? "";

  const SUBJECT_CHOICES = [
    { token: "combined", label: "Combined Science (Bio/Chem)" },
    { token: "biology", label: "Pure Biology" },
    { token: "chemistry", label: "Pure Chemistry" },
  ];
  const LEVELS = [
    { v: "G3", label: "Sec 3–4 (G3)" },
    { v: "G2", label: "Sec 3–4 (G2)" },
    { v: "G1", label: "Sec 3–4 (G1)" },
    { v: "O", label: "O-Level" },
  ];
  const toggleSubject = (t: string) =>
    setSubjects((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    );

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
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "student", label: "Student" },
                { v: "tutor", label: "Tutor" },
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

          {role === "student" && (
            <>
              <div>
                <p className="text-xs font-medium text-ink-3 mb-2 px-1">
                  What are you studying?
                </p>
                <div className="space-y-2">
                  {SUBJECT_CHOICES.map((o) => {
                    const on = subjects.includes(o.token);
                    return (
                      <button
                        key={o.token}
                        type="button"
                        onClick={() => toggleSubject(o.token)}
                        aria-pressed={on}
                        className={cn(
                          "w-full h-11 px-4 rounded-[12px] text-sm font-medium border transition-all text-left flex items-center justify-between",
                          on
                            ? "bg-accent text-white border-accent shadow-sm"
                            : "bg-surface-2 text-ink-2 border-hairline hover:text-ink"
                        )}
                      >
                        {o.label}
                        {on && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="hidden"
                  name="study_subjects"
                  value={JSON.stringify(subjects)}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-ink-3 mb-2 px-1">Level</p>
                <select
                  name="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline text-[15px] text-ink outline-none focus:border-accent"
                >
                  {LEVELS.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
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

      {!isSignup && (
        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot"
            className="text-sm font-medium text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-danger px-1">{state.error}</p>
      )}
      {state.message && (
        <p className="text-sm text-accent px-1">{state.message}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          pending || (isSignup && role === "student" && subjects.length === 0)
        }
      >
        {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
      </Button>
      {isSignup && role === "student" && subjects.length === 0 && (
        <p className="text-center text-xs text-ink-3 -mt-1">
          Pick at least one subject to continue.
        </p>
      )}

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
