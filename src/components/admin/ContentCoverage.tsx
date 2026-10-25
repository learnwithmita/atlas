import Link from "next/link";
import { BookText, Check, LayoutGrid, Layers, PenLine } from "lucide-react";
import type { SubjectCoverage } from "@/lib/data";
import { Card } from "@/components/ui/Card";

/**
 * Admin content-coverage dashboard: for each topic, which of the four assets
 * (notes, summary, questions, flashcards) are in place — so it's obvious what's
 * missing and still to fill in. Every row opens that topic's studio.
 */
export function ContentCoverage({ subjects }: { subjects: SubjectCoverage[] }) {
  if (subjects.length === 0) {
    return (
      <Card className="p-8 text-center text-ink-2">
        No curriculum loaded yet. Upload a syllabus to see coverage here.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {subjects.map((s) => (
        <Card key={s.subject} className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-hairline">
            <h3 className="text-lg font-semibold text-ink">{s.subject}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
              <Stat label="Notes" done={s.totals.notes} total={s.totals.topics} />
              <Stat label="Summary" done={s.totals.summary} total={s.totals.topics} />
              <Stat label="Questions" done={s.totals.questions} total={s.totals.topics} />
              <Stat label="Flashcards" done={s.totals.flashcards} total={s.totals.topics} />
            </div>
          </div>

          {/* Column header */}
          <div className="hidden sm:grid grid-cols-[1fr_repeat(4,72px)] items-center gap-2 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-3 border-b border-hairline">
            <span>Topic</span>
            <HeadCell icon={BookText} label="Notes" />
            <HeadCell icon={LayoutGrid} label="Summary" />
            <HeadCell icon={PenLine} label="Qs" />
            <HeadCell icon={Layers} label="Cards" />
          </div>

          <ul className="divide-y divide-hairline">
            {s.topics.map((t) => (
              <li key={t.topicId}>
                <Link
                  href={`/admin/studio/${t.topicId}`}
                  className="grid grid-cols-[1fr_repeat(4,44px)] sm:grid-cols-[1fr_repeat(4,72px)] items-center gap-2 px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <span className="text-[15px] text-ink min-w-0 truncate pr-2">
                    {t.topicName}
                  </span>
                  <Cell on={t.hasNotes} />
                  <Cell on={t.hasSummary} />
                  <Cell on={t.questionCount > 0} count={t.questionCount} />
                  <Cell on={t.cardCount > 0} count={t.cardCount} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, done, total }: { label: string; done: number; total: number }) {
  const complete = total > 0 && done === total;
  return (
    <span className="tabular-nums">
      {label}{" "}
      <strong className={complete ? "text-mint" : "text-ink"}>
        {done}/{total}
      </strong>
    </span>
  );
}

function HeadCell({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1" title={label}>
      <Icon size={13} /> {label}
    </span>
  );
}

/** A status cell: green check when present, muted dash when missing. Counts
 * (questions/flashcards) show the number so partial coverage is visible. */
function Cell({ on, count }: { on: boolean; count?: number }) {
  return (
    <span className="flex items-center justify-center">
      {on ? (
        count !== undefined ? (
          <span className="inline-flex items-center justify-center min-w-7 h-6 px-1.5 rounded-full bg-accent-soft text-accent text-xs font-semibold tabular-nums">
            {count}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-mint/15 text-mint">
            <Check size={14} strokeWidth={3} />
          </span>
        )
      ) : (
        <span className="text-ink-3" aria-label="missing">
          –
        </span>
      )}
    </span>
  );
}
