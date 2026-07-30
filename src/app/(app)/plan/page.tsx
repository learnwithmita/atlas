import { getStudentDashboard } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Flame, Target, TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Study Plan · Atlas" };
export const dynamic = "force-dynamic";

const bucketMeta = {
  fix_first: { icon: Flame, tone: "flame" as const, color: "text-flame" },
  high_priority: { icon: Target, tone: "accent" as const, color: "text-accent" },
  low_hanging: { icon: TrendingUp, tone: "mint" as const, color: "text-mint" },
};

export default async function PlanPage() {
  const d = await getStudentDashboard();

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">Study plan</h1>
        <p className="text-ink-2 mt-1">
          A living plan — it re-ranks as your mastery shifts.
        </p>
      </header>

      {!d.hasData ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {d.buckets.map((b) => {
            const m = bucketMeta[b.key];
            const Icon = m.icon;
            return (
              <Card key={b.key} className="p-6">
                <div className="flex items-center gap-2.5 mb-1">
                  <Icon size={20} className={m.color} />
                  <h2 className="text-lg font-semibold text-ink">{b.title}</h2>
                  <Badge tone={m.tone}>{b.items.length}</Badge>
                </div>
                <p className="text-sm text-ink-3 mb-4">{b.blurb}</p>
                {b.items.length === 0 ? (
                  <p className="text-sm text-ink-2 py-4">
                    Nothing here — you&apos;re on top of it.
                  </p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {b.items.map((o) => (
                      <li key={o.outcomeId}>
                        <Link
                          href="/practice"
                          className="flex items-center gap-4 py-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] text-ink font-medium">
                              {o.subtopic}
                            </p>
                            <p className="text-sm text-ink-3 truncate">
                              {o.statement}
                            </p>
                          </div>
                          <div className="w-24 shrink-0">
                            <MasteryBar value={o.mastery} />
                            <p className="text-xs text-ink-3 mt-1 text-right tabular-nums">
                              {Math.round(o.mastery)}%
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
