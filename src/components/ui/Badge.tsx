import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Tone = "neutral" | "accent" | "flame" | "danger" | "mint";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-soft text-accent",
  flame: "bg-flame-soft text-flame",
  danger: "bg-danger/10 text-danger",
  mint: "bg-mint/12 text-mint",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
