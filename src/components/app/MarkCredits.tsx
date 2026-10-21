"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mirrors the return of getMarkUsage() in @/lib/entitlements. */
export type MarkUsage = {
  tier: "free" | "pro" | "premium";
  cap: number | null; // null = unlimited
  used: number;
  remaining: number | null;
};

/** Full card for the desktop sidebar: AI-marks left today + a thin usage bar. */
export function MarkCredits({ usage }: { usage: MarkUsage }) {
  const unlimited = usage.cap === null;
  const cap = usage.cap ?? 0;
  const remaining = usage.remaining ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((usage.used / cap) * 100)) : 0;
  const low = !unlimited && remaining <= Math.max(1, Math.ceil(cap * 0.2));

  return (
    <div className="px-3 py-2.5 rounded-[12px] bg-surface-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-2 flex items-center gap-1.5">
          <Sparkles size={14} /> AI marks
        </span>
        {unlimited ? (
          <span className="text-sm font-semibold text-accent">Unlimited</span>
        ) : (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              low ? "text-flame" : "text-ink"
            )}
          >
            {remaining} left
          </span>
        )}
      </div>

      {!unlimited && (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-hairline overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                low ? "bg-flame" : "bg-accent"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink-3">
            <span className="tabular-nums">
              {usage.used}/{cap} today
            </span>
            {usage.tier !== "premium" && (
              <Link href="/pricing" className="text-accent font-medium hover:underline">
                {remaining <= 0 ? "Get more" : "Upgrade"}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Compact chip for the mobile header. Hidden for unlimited users. */
export function MarkCreditsChip({ usage }: { usage: MarkUsage }) {
  if (usage.cap === null) return null;
  const remaining = usage.remaining ?? 0;
  const out = remaining <= 0;
  return (
    <span
      aria-label={`${remaining} AI marks left today`}
      className={cn(
        "flex items-center gap-1 h-8 px-2 rounded-full text-xs font-semibold tabular-nums",
        out ? "bg-flame-soft text-flame" : "bg-accent-soft text-accent"
      )}
    >
      <Sparkles size={13} /> {remaining}
    </span>
  );
}
