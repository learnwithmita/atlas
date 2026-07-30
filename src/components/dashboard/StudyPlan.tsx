"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Target, TrendingUp } from "lucide-react";
import type { StudyBucket } from "@/lib/data";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { cn } from "@/lib/utils";

const meta = {
  fix_first: { icon: Flame, tone: "text-flame" },
  high_priority: { icon: Target, tone: "text-accent" },
  low_hanging: { icon: TrendingUp, tone: "text-mint" },
} as const;

export function StudyPlan({ buckets }: { buckets: StudyBucket[] }) {
  const [active, setActive] = useState(0);
  const bucket = buckets[active];

  return (
    <div>
      <div className="flex gap-1.5 p-1 rounded-full bg-surface-2 w-fit mb-5">
        {buckets.map((b, i) => {
          const Icon = meta[b.key].icon;
          return (
            <button
              key={b.key}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-all",
                i === active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              )}
            >
              <Icon size={15} className={i === active ? meta[b.key].tone : ""} />
              {b.title}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-ink-3 mb-4">{bucket.blurb}</p>

      {bucket.items.length === 0 ? (
        <p className="text-sm text-ink-2 py-8 text-center">
          Nothing here right now — great work.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {bucket.items.map((o) => (
            <li key={o.outcomeId}>
              <Link
                href="/practice"
                className="group flex items-center gap-4 p-3.5 rounded-[14px] hover:bg-surface-2 transition-colors"
              >
                <div className="w-16 shrink-0">
                  <MasteryBar value={o.mastery} />
                  <span className="text-xs text-ink-3 tabular-nums mt-1 block">
                    {Math.round(o.mastery)}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink font-medium truncate">
                    {o.subtopic || o.statement}
                  </p>
                  <p className="text-xs text-ink-3 truncate">
                    {o.topic} · {o.subject}
                    {o.frequency >= 4 && (
                      <span className="text-flame">
                        {"  ·  "}tested often
                      </span>
                    )}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-ink-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
