"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { joinClassroom } from "@/app/(app)/actions";

export function JoinClass() {
  const [state, action, pending] = useActionState(joinClassroom, {});

  return (
    <form action={action} className="flex items-center gap-2">
      <div className="relative flex-1">
        <LogIn
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          name="code"
          placeholder="Class code"
          autoCapitalize="characters"
          className="w-full h-10 pl-9 pr-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-sm text-ink uppercase tracking-widest placeholder:tracking-normal placeholder:normal-case"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Joining…" : "Join class"}
      </Button>
      {state?.ok && (
        <span className="text-sm text-mint">Joined {state.name}!</span>
      )}
      {state?.error && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
