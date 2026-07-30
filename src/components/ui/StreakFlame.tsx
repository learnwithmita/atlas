import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Streak indicator — tasteful warm amber, not cartoonish. */
export function StreakFlame({
  days,
  size = "md",
  className,
}: {
  days: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = { sm: 16, md: 20, lg: 28 }[size];
  const text = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];
  const active = days > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold tabular-nums",
        active ? "text-flame" : "text-ink-3",
        className
      )}
      title={`${days}-day streak`}
    >
      <Flame
        size={dim}
        strokeWidth={2.2}
        fill={active ? "currentColor" : "none"}
        className={active ? "drop-shadow-[0_2px_6px_rgba(255,159,10,0.35)]" : ""}
      />
      <span className={text}>{days}</span>
    </span>
  );
}
