import { cn } from "@/lib/utils";
import Link from "next/link";

/** Minimalist Atlas mark: a soft orbit ring with an accent node. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="11" stroke="var(--color-accent)" strokeWidth="2.2" opacity="0.35" />
      <ellipse cx="16" cy="16" rx="11" ry="4.5" stroke="var(--color-accent)" strokeWidth="2.2" opacity="0.35" transform="rotate(38 16 16)" />
      <circle cx="16" cy="16" r="4.2" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  showText = true,
}: {
  className?: string;
  href?: string;
  showText?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && (
        <span className="text-[19px] font-semibold tracking-tight text-ink">
          Atlas
        </span>
      )}
    </Link>
  );
}
