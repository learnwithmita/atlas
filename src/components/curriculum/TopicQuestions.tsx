import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { BankQuestion } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/ui/MathText";
import { AnswerReveal } from "@/components/curriculum/AnswerReveal";

export function TopicQuestions({
  topicName,
  subject,
  questions,
  backHref,
  builder,
  printHref,
  studioHref,
}: {
  topicName: string;
  subject: string;
  questions: BankQuestion[];
  backHref: string;
  builder?: React.ReactNode;
  printHref?: string;
  studioHref?: string;
}) {
  const generated = questions.filter((q) => q.origin === "generated");
  const bank = questions.filter((q) => q.origin === "bank");
  const extracted = questions.filter((q) => q.origin === "extracted");

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Question bank
      </Link>
      <header className="mb-6">
        <p className="text-sm text-ink-3">{subject}</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">{topicName}</h1>
        <p className="text-ink-2 mt-1">
          {questions.length} questions
          {[
            generated.length ? `${generated.length} AI bank` : "",
            extracted.length ? `${extracted.length} from papers` : "",
            bank.length ? `${bank.length} starter` : "",
          ]
            .filter(Boolean)
            .map((s) => ` · ${s}`)
            .join("")}
        </p>
        {(printHref || studioHref) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {studioHref && (
              <Link
                href={studioHref}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent"
              >
                <Sparkles size={14} /> Flashcards &amp; notes
              </Link>
            )}
            {printHref && questions.length > 0 && (
              <>
                <Link
                  href={printHref}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent"
                >
                  <Printer size={14} /> Print questions
                </Link>
                <Link
                  href={`${printHref}?answers=1`}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent"
                >
                  <Printer size={14} /> Print with answers
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {builder}

      {questions.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          No questions in this topic yet. Extract a past paper on the Uploads /
          Materials page, or they&apos;ll appear as the bank grows.
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink">
                    <MathText>{q.stem}</MathText>
                  </p>
                  {q.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={q.imageUrl}
                      alt=""
                      className="mt-3 max-h-56 w-auto rounded-[12px] border border-hairline bg-white"
                    />
                  )}
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
                    <Badge
                      tone={
                        q.origin === "extracted"
                          ? "mint"
                          : q.origin === "generated"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {q.origin === "extracted"
                        ? "from paper"
                        : q.origin === "generated"
                          ? "AI bank"
                          : "curated"}
                    </Badge>
                  </div>
                  {q.source && (
                    <p className="text-xs text-ink-3 mt-1.5">Adapted from {q.source}</p>
                  )}
                  {q.answer && <AnswerReveal answer={q.answer} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
