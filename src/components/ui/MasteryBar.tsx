import { clamp, cn } from "@/lib/utils";

/** A slim mastery/progress bar. Uses the accent scale (never green). */
export function MasteryBar({
  value,
  className,
  tone = "accent",
}: {
  value: number;
  className?: string;
  tone?: "accent" | "flame";
}) {
  const v = clamp(value);
  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-surface-2 overflow-hidden",
        className
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${v}%`,
          background:
            tone === "flame"
              ? "var(--color-flame)"
              : "linear-gradient(90deg, var(--color-accent), var(--color-accent-strong))",
        }}
      />
    </div>
  );
}
