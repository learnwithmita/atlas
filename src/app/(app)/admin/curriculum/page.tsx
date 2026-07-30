import { ChevronRight } from "lucide-react";
import { getFullCurriculum } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Curriculum · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage() {
  const subjects = await getFullCurriculum();

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Curriculum</h1>
        <p className="text-ink-2 mt-1">
          The SEAB syllabus spine powering the app. Every question and lesson
          maps to a learning outcome here.
        </p>
      </header>

      {subjects.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          No curriculum loaded. Connect Supabase and run{" "}
          <code>supabase/seed.sql</code>.
        </Card>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => {
            const outcomes = subject.topics.reduce(
              (n, t) => n + t.outcomeCount,
              0
            );
            return (
              <Card key={subject.id} className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-semibold text-ink">
                    {subject.name}
                  </h2>
                  {subject.code && <Badge tone="accent">Syllabus {subject.code}</Badge>}
                </div>
                <p className="text-sm text-ink-3 mb-5">
                  {subject.topics.length} topics · {outcomes} learning outcomes
                </p>

                <div className="space-y-1.5">
                  {subject.topics.map((topic) => (
                    <details key={topic.id} className="group rounded-[12px] border border-hairline">
                      <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none select-none">
                        <ChevronRight
                          size={16}
                          className="text-ink-3 transition-transform group-open:rotate-90 shrink-0"
                        />
                        <span className="font-medium text-ink flex-1">
                          {topic.name}
                        </span>
                        <span className="text-xs text-ink-3 tabular-nums">
                          {topic.outcomeCount} outcomes
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pl-10 space-y-4">
                        {topic.subtopics.map((st) => (
                          <div key={st.id}>
                            <p className="text-sm font-semibold text-ink-2 mb-2">
                              {st.name}
                            </p>
                            <ul className="space-y-2">
                              {st.outcomes.map((o) => (
                                <li key={o.id} className="flex items-start gap-3 text-sm">
                                  {o.code && (
                                    <span className="shrink-0 font-mono text-xs text-accent bg-accent-soft rounded px-1.5 py-0.5 mt-0.5">
                                      {o.code}
                                    </span>
                                  )}
                                  <span className="text-ink flex-1">{o.statement}</span>
                                  <span
                                    className="shrink-0 text-xs text-ink-3 tabular-nums"
                                    title="Exam frequency (1–5)"
                                  >
                                    freq {o.frequency}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
