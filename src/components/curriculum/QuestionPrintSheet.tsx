import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PrintableQuestion } from "@/lib/data";
import { MathText } from "@/components/ui/MathText";
import { PrintButton } from "@/components/cards/PrintButton";

/**
 * Printable question worksheet. Two modes: questions only, or questions with
 * answers/mark schemes (same numbering, so they line up). Designed for clean
 * black-and-white printing.
 */
export function QuestionPrintSheet({
  topicName,
  subject,
  questions,
  withAnswers,
  backHref,
}: {
  topicName: string;
  subject: string;
  questions: PrintableQuestion[];
  withAnswers: boolean;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 print-sheet">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`${backHref}/print`}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              withAnswers ? "border-hairline text-ink-2" : "border-accent text-accent"
            }`}
          >
            Questions only
          </Link>
          <Link
            href={`${backHref}/print?answers=1`}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              withAnswers ? "border-accent text-accent" : "border-hairline text-ink-2"
            }`}
          >
            With answers
          </Link>
          <PrintButton />
        </div>
      </div>

      <header className="mb-6 border-b border-hairline pb-4">
        <h1 className="text-2xl font-bold text-ink">{topicName}</h1>
        <p className="text-ink-2 text-sm mt-0.5">
          {subject} · {questions.length} questions
          {withAnswers ? " · answer key" : ""}
        </p>
      </header>

      {questions.length === 0 ? (
        <p className="text-ink-2">No questions for this topic yet.</p>
      ) : (
        <ol className="space-y-5">
          {questions.map((q) => (
            <li key={q.n} className="flex gap-3 break-inside-avoid">
              <span className="font-semibold text-ink tabular-nums shrink-0">{q.n}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink leading-relaxed">
                  <MathText>{q.stem}</MathText>
                  {q.marks ? (
                    <span className="text-ink-3 ml-2">[{q.marks}]</span>
                  ) : null}
                </p>
                {q.source && (
                  <p className="text-xs text-ink-3 mt-0.5">Source: {q.source}</p>
                )}
                {withAnswers && (
                  <div className="mt-2 pl-3 border-l-2 border-hairline">
                    {q.answer ? (
                      <p className="text-sm text-ink-2 whitespace-pre-line">
                        <MathText>{q.answer}</MathText>
                      </p>
                    ) : (
                      <p className="text-sm text-ink-3 italic">
                        No stored mark scheme (paper question).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
