import Link from "next/link";
import { AlertTriangle, TrendingDown } from "lucide-react";
import type { ClassStudent, WeakTopic } from "@/lib/data";
import { Card } from "@/components/ui/Card";

function tone(pct: number | null): { text: string; bar: string; bg: string } {
  if (pct == null) return { text: "text-ink-3", bar: "bg-ink-3/30", bg: "bg-surface-2" };
  if (pct < 50) return { text: "text-danger", bar: "bg-danger", bg: "bg-danger/10" };
  if (pct < 70) return { text: "text-flame", bar: "bg-flame", bg: "bg-flame-soft" };
  return { text: "text-mint", bar: "bg-mint", bg: "bg-mint/10" };
}

/** Read-only weak-area insight for a tutor's classroom. */
export function ClassInsights({
  weakTopics,
  students,
}: {
  weakTopics: WeakTopic[];
  students: ClassStudent[];
}) {
  const hasData = weakTopics.length > 0 || students.some((s) => s.attempts > 0);

  if (!hasData) {
    return (
      <Card className="p-6 text-center text-ink-2">
        <TrendingDown className="mx-auto text-ink-3 mb-2" size={22} />
        No practice data yet. Once students practise or complete assignments,
        their weak areas show up here.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weakest topics */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={17} className="text-flame" />
          <h2 className="text-lg font-semibold text-ink">Weakest topics</h2>
        </div>
        {weakTopics.length === 0 ? (
          <Card className="p-5 text-sm text-ink-2">
            No topic-tagged practice yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {weakTopics.slice(0, 8).map((t) => {
              const c = tone(t.avgPct);
              return (
                <Card key={t.topicId} className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <Link
                        href={`/teach/bank/${t.topicId}`}
                        className="font-medium text-ink hover:text-accent truncate block"
                      >
                        {t.topicName}
                      </Link>
                      <p className="text-xs text-ink-3">
                        {t.subject} · {t.attempts} attempts · {t.students} student
                        {t.students === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className={`text-lg font-semibold tabular-nums ${c.text}`}>
                      {t.avgPct == null ? "—" : `${t.avgPct}%`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={`h-full ${c.bar}`}
                      style={{ width: `${t.avgPct ?? 0}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Students needing attention */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-3">
          Students needing attention
        </h2>
        <Card className="p-2">
          <ul className="divide-y divide-hairline">
            {students.map((s) => {
              const c = tone(s.avgPct);
              return (
                <li key={s.studentId} className="flex items-center gap-3 p-3">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-accent grid place-items-center text-white text-sm font-semibold">
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink font-medium truncate">{s.name}</p>
                    <p className="text-xs text-ink-3">
                      {s.attempts === 0 ? "No practice yet" : `${s.attempts} attempts`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums rounded-full px-2.5 py-1 ${c.bg} ${c.text}`}
                  >
                    {s.avgPct == null ? "—" : `${s.avgPct}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
