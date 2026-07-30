import {
  Activity,
  BadgeDollarSign,
  Gauge,
  PenLine,
  Timer,
  Users,
} from "lucide-react";
import { getAdminAnalytics } from "@/lib/data";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { Badge } from "@/components/ui/Badge";
import { clamp } from "@/lib/utils";

export const metadata = { title: "Analytics · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const a = await getAdminAnalytics();

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Analytics</h1>
      </header>

      {!a.configured && (
        <Card className="p-5 mb-6 bg-accent-soft border-0">
          <p className="text-sm text-ink">
            Connect Supabase (add keys to <code>.env.local</code>) to populate
            these metrics from live data.
          </p>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatTile
          label="Students"
          value={String(a.totalStudents)}
          sub="registered"
          icon={Users}
        />
        <StatTile
          label="Active this week"
          value={String(a.activeThisWeek)}
          sub={
            a.totalStudents
              ? `${Math.round((a.activeThisWeek / a.totalStudents) * 100)}% of registered`
              : "—"
          }
          icon={Activity}
        />
        <StatTile
          label="Answers marked"
          value={a.attemptsMarked.toLocaleString()}
          sub="all time"
          icon={PenLine}
        />
        <StatTile
          label="Avg mastery"
          value={`${a.avgMastery}%`}
          sub="across all students"
          icon={Gauge}
        />
        <StatTile
          label="AI spend"
          value={`$${a.aiSpendUsd.toFixed(2)}`}
          sub="logged in ai_events"
          icon={BadgeDollarSign}
        />
        <StatTile
          label="Avg AI latency"
          value={a.avgLatencyMs ? `${(a.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
          sub="per call"
          icon={Timer}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Mastery by topic */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink mb-1">
            Mastery by topic
          </h2>
          <p className="text-sm text-ink-3 mb-5">Weakest topics first</p>
          {a.masteryByTopic.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-4">
              {a.masteryByTopic.map((t) => (
                <li key={t.topic}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink font-medium">
                      {t.topic}
                    </span>
                    <span className="text-sm text-ink-3 tabular-nums">
                      {t.mastery}%
                    </span>
                  </div>
                  <MasteryBar
                    value={t.mastery}
                    tone={t.mastery < 50 ? "flame" : "accent"}
                  />
                  <p className="text-xs text-ink-3 mt-1">
                    {t.subject} · {t.learners} learner
                    {t.learners === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Hardest outcomes */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink mb-1">
            Hardest learning outcomes
          </h2>
          <p className="text-sm text-ink-3 mb-5">
            Low mastery, weighted by exam frequency
          </p>
          {a.hardestOutcomes.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-3">
              {a.hardestOutcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-sm font-semibold text-ink-3 tabular-nums w-6 shrink-0">
                    {o.mastery}%
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink line-clamp-2">
                      {o.statement}
                    </p>
                    <p className="text-xs text-ink-3 mt-0.5">{o.subtopic}</p>
                  </div>
                  {o.frequency >= 4 && <Badge tone="flame">high freq</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AI spend by operation */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink mb-1">
            AI cost by operation
          </h2>
          <p className="text-sm text-ink-3 mb-5">Where the money goes</p>
          {a.spendByOp.length === 0 ? (
            <Empty note="No AI events logged yet." />
          ) : (
            <ul className="space-y-4">
              {a.spendByOp.map((s) => {
                const max = Math.max(...a.spendByOp.map((x) => x.cost), 0.0001);
                return (
                  <li key={s.op}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-ink font-medium capitalize">
                        {s.op}
                      </span>
                      <span className="text-sm text-ink-3 tabular-nums">
                        ${s.cost.toFixed(3)} · {s.calls}×
                      </span>
                    </div>
                    <MasteryBar value={clamp((s.cost / max) * 100)} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Signups */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink mb-1">Signups</h2>
          <p className="text-sm text-ink-3 mb-5">Last 14 days with activity</p>
          {a.signupsByDay.length === 0 ? (
            <Empty />
          ) : (
            <div className="flex items-end gap-1.5 h-32">
              {a.signupsByDay.map((d) => {
                const max = Math.max(...a.signupsByDay.map((x) => x.count), 1);
                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-md bg-accent/80"
                        style={{
                          height: `${clamp((d.count / max) * 100, 6)}%`,
                        }}
                        title={`${d.count} on ${d.day}`}
                      />
                    </div>
                    <span className="text-[10px] text-ink-3">
                      {d.day.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty({ note = "No data yet." }: { note?: string }) {
  return <p className="text-sm text-ink-3 py-8 text-center">{note}</p>;
}
