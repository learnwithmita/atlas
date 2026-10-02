"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

/**
 * Shown when a free user hits a Pro gate (e.g. the daily marking cap). Keep the
 * copy specific to the limit they hit (passed as `message`).
 */
export function UpgradeDialog({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message?: string | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-static/40 backdrop-blur-sm p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[22px] border border-hairline bg-surface p-7 shadow-lg text-center animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 w-12 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
          <Sparkles className="text-accent" size={22} />
        </div>
        <h2 className="text-xl font-semibold text-ink mb-1.5">Unlock Atlas Pro</h2>
        <p className="text-ink-2 text-sm mb-6">
          {message ??
            "You've reached today's free limit. Upgrade to Pro for unlimited marking and custom papers."}
        </p>
        <div className="flex flex-col gap-2">
          <LinkButton href="/pricing" size="lg">
            See Pro — free for 7 days
          </LinkButton>
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
        </div>
        <p className="text-xs text-ink-3 mt-4">
          <Link href="/pricing" className="hover:text-ink">
            About S$1 a day · cancel anytime
          </Link>
        </p>
      </div>
    </div>
  );
}
