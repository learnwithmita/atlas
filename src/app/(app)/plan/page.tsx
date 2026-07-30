import Link from "next/link";
import { Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import { getCurriculumProgress, getStudentDashboard } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { DiagnosticBanner } from "@/components/dashboard/DiagnosticBanner";

export const metadata = { title: "Study Plan · Atlas" };
export const dynamic = "force-dynamic";

const bucketMeta = {
  fix_first: { icon: Flame, tone: "flame" as const, color: "text-flame" },
  high_priority: { icon: Target, tone: "accent" as const, color: "text-accent" },
  low_hanging: { icon: TrendingUp, tone: "mint" as const, color: "text-mint" },
};

export default async function PlanPage() {
  const [d, curriculum] = await Promise.all([
    getStudentDashboard(),
    getCurriculumProgress(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">Study plan</h1>
        <p className="text-ink-2 mt-1">
          Your whole syllabus, with progress. It re-ranks as your mastery shifts.
        </p>
      </header>

      {!d.hasData && <DiagnosticBanner className="mb-6" />}

      {/* Priority buckets — only once there's data to rank */}
      {d.hasData && (
        <div className="space-y-4 mb-8">
          {d.buckets
            .filter((b) => b.items.length > 0)
            .map((b) => {
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
                  <ul className="divide-y divide-hairline">
                    {b.items.map((o) => (
                      <li key={o.outcomeId}>
                        <Link
                          href="/practice"
                          className="flex items-center gap-4 py-3"
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
                </Card>
              );
            })}
        </div>
      )}

      {/* Full syllabus with progress */}
      <div className="space-y-6">
        {curriculum.length === 0 && (
          <Card className="p-8 text-center text-ink-2">
            No curriculum loaded yet. Connect Supabase and run the seed to see
            Biology & Chemistry here.
          </Card>
        )}
        {curriculum.map((subject) => (
          <Card key={subject.id} className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-ink">{subject.name}</h2>
              <span className="text-sm text-ink-3 tabular-nums">
                {subject.mastery}% overall
              </span>
            </div>
            <p className="text-sm text-ink-3 mb-5">
              {subject.topics.length} topics
            </p>
            <ul className="space-y-4">
              {subject.topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href="/practice"
                    className="group block rounded-[12px] -mx-2 px-2 py-2 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-3">
                      <span className="text-[15px] text-ink font-medium">
                        {t.name}
                      </span>
                      <span className="text-sm text-ink-3 tabular-nums shrink-0">
                        {t.mastery}%
                      </span>
                    </div>
                    <MasteryBar
                      value={t.mastery}
                      tone={t.mastery > 0 && t.mastery < 50 ? "flame" : "accent"}
                    />
                    <p className="text-xs text-ink-3 mt-1.5">
                      {t.practised} of {t.outcomeCount} learning outcomes
                      practised
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <LinkButton href="/practice" size="lg">
          <Sparkles size={17} /> Practise now
        </LinkButton>
      </div>
    </div>
  );
}
