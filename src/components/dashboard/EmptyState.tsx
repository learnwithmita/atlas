"use client";

import { useTransition } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { seedDemoProgress } from "@/app/(app)/actions";

export function EmptyState() {
  const [pending, start] = useTransition();

  return (
    <div className="max-w-lg mx-auto text-center py-16 animate-fade-up">
      <div className="h-16 w-16 mx-auto rounded-[20px] bg-accent-soft grid place-items-center mb-6">
        <Sparkles className="text-accent" size={28} />
      </div>
      <h2 className="text-2xl font-semibold text-ink mb-2">
        Let&apos;s map what you know
      </h2>
      <p className="text-ink-2 mb-8 leading-relaxed">
        Take a short diagnostic and Atlas builds your mastery map and a study
        plan. Or load a sample so you can explore the dashboard right away.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <LinkButton href="/practice" size="lg">
          Start diagnostic
        </LinkButton>
        <Button
          variant="secondary"
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await seedDemoProgress();
            })
          }
        >
          <Wand2 size={17} />
          {pending ? "Loading…" : "Load sample progress"}
        </Button>
      </div>
    </div>
  );
}
