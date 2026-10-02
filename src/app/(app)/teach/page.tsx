import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, GraduationCap, PencilRuler, Users } from "lucide-react";
import { getFullCurriculum, getTutorClassrooms, getTutorOverview } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateClassroom } from "@/components/teach/CreateClassroom";

export const metadata = { title: "Dashboard · Atlas" };
export const dynamic = "force-dynamic";

function pctTone(pct: number | null) {
  if (pct == null) return { text: "text-ink-3", bar: "bg-ink-3/30" };
  if (pct < 50) return { text: "text-danger", bar: "bg-danger" };
  if (pct < 70) return { text: "text-flame", bar: "bg-flame" };
  return { text: "text-mint", bar: "bg-mint" };
}

export default async function TeachHome() {
  const [classrooms, subjects, overview] = await Promise.all([
    getTutorClassrooms(),
    getFullCurriculum(),
    getTutorOverview(),
  ]);

  const stats = [
    { label: "Students", value: String(overview.studentCount), icon: Users },
    { label: "Classes", value: String(overview.classCount), icon: GraduationCap },
    { label: "Answers marked", value: String(overview.totalAttempts), icon: PencilRuler },
    {
      label: "Avg score",
      value: overview.avgPct == null ? "—" : `${overview.avgPct}%`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="text-ink-2 mt-1">
            Track your classes and see where students are struggling.
          </p>
        </div>
        <CreateClassroom subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
      </header>

      {classrooms.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="h-14 w-14 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
            <Users className="text-accent" size={26} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-1">No classes yet</h2>
          <p className="text-ink-2">
            Create your first class — students join with the invite code and
            appear here.
          </p>
        </Card>
      ) : (
        <>
          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-4">
                  <Icon size={18} className="text-ink-3 mb-2" />
                  <p className="text-2xl font-semibold text-ink tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">{s.label}</p>
                </Card>
              );
            })}
          </div>

          {/* Weakest topics across all classes */}
          {overview.weakTopics.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={17} className="text-flame" />
                <h2 className="text-lg font-semibold text-ink">
                  Weakest topics across your classes
                </h2>
              </div>
              <div className="space-y-2">
                {overview.weakTopics.map((t) => {
                  const c = pctTone(t.avgPct);
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
                            {t.subject} · {t.attempts} attempts · {t.students}{" "}
                            student{t.students === 1 ? "" : "s"}
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
            </section>
          )}

          {/* Classes */}
          <h2 className="text-lg font-semibold text-ink mb-3">Your classes</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {classrooms.map((c) => (
              <Link key={c.id} href={`/teach/${c.id}`} className="group">
                <Card className="p-6 h-full hover:border-accent transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-ink text-lg">{c.name}</h3>
                    {c.subject && <Badge tone="accent">{c.subject}</Badge>}
                  </div>
                  <p className="text-sm text-ink-3 mt-1 flex items-center gap-1.5">
                    <Users size={14} /> {c.memberCount} student
                    {c.memberCount === 1 ? "" : "s"}
                  </p>
                  <div className="mt-4 flex items-center justify-between rounded-[12px] bg-surface-2 px-4 py-3">
                    <div>
                      <p className="text-xs text-ink-3">Invite code</p>
                      <p className="font-mono text-lg font-semibold text-ink tracking-widest">
                        {c.invite_code}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-ink-3 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
