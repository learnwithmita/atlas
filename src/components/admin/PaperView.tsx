import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PaperView as PaperViewData } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function PaperView({
  paper,
  backHref,
}: {
  paper: PaperViewData;
  backHref: string;
}) {
  const classified = paper.topics.filter((t) => t.topicId);
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Materials
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">{paper.title}</h1>
        <p className="text-ink-2 mt-1">
          {paper.total} adapted practice questions
          {paper.subject ? ` · ${paper.subject}` : ""}
        </p>
        {paper.source && (
          <p className="text-sm text-ink-3 mt-1">Adapted from {paper.source}</p>
        )}
      </header>

      <Card className="p-3 mb-6 bg-surface-2 border-0">
        <p className="text-xs text-ink-2 px-2 py-1">
          Questions are <strong>rephrased</strong> to test the same concepts —
          not verbatim copies of the original paper.
        </p>
      </Card>

      {/* Topics tested summary */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-ink mb-1">Topics tested</h2>
        <p className="text-sm text-ink-3 mb-4">
          Which of the syllabus topics this paper covers.
        </p>
        {classified.length === 0 ? (
          <p className="text-sm text-ink-2">No topics could be classified.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {paper.topics.map((t) => (
              <Badge key={t.topicId ?? t.topicName} tone={t.topicId ? "accent" : "neutral"}>
                {t.topicName} · {t.questions.length}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Questions grouped by topic */}
      <div className="space-y-6">
        {paper.topics.map((t) => (
          <div key={t.topicId ?? t.topicName}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-3 mb-3">
              {t.topicName}
            </h3>
            <div className="space-y-2">
              {t.questions.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {q.number && (
                      <span className="shrink-0 font-mono text-sm text-ink-3 mt-0.5">
                        {q.number}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] text-ink">{q.stem}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {q.commandWords.map((c) => (
                          <Badge key={c} tone="accent" className="capitalize">
                            {c}
                          </Badge>
                        ))}
                        {q.marks ? (
                          <span className="text-xs text-ink-3">
                            [{q.marks} {q.marks === 1 ? "mark" : "marks"}]
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-ink-3 mt-8">
        Coming next: assign these questions to a class or student, and promote
        good ones into the shared question bank.
      </p>
    </div>
  );
}
