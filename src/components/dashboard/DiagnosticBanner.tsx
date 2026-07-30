"use client";

import { useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { seedDemoProgress } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

/** Compact call-to-action shown when a student has no progress yet. */
export function DiagnosticBanner({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <div
      className={cn(
        "rounded-[18px] bg-accent-soft border border-accent/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4",
        className
      )}
    >
      <span className="h-11 w-11 shrink-0 rounded-[14px] bg-accent grid place-items-center">
        <Sparkles className="text-white" size={22} />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-ink">Personalise your plan</p>
        <p className="text-sm text-ink-2">
          Take a short diagnostic and Atlas ranks every topic for you — or load
          a sample to explore.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <LinkButton href="/practice" size="sm">
          Start diagnostic
        </LinkButton>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => start(async () => {
            await seedDemoProgress();
          })}
        >
          <Wand2 size={15} />
          {pending ? "Loading…" : "Load sample"}
        </Button>
      </div>
    </div>
  );
}
