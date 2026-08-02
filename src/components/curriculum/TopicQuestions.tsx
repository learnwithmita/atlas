import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BankQuestion } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/ui/MathText";

export function TopicQuestions({
  topicName,
  subject,
  questions,
  backHref,
}: {
  topicName: string;
  subject: string;
  questions: BankQuestion[];
  backHref: string;
}) {
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
          {questions.length} questions · {bank.length} curated · {extracted.length} from papers
        </p>
      </header>

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
                    <Badge tone={q.origin === "extracted" ? "mint" : "neutral"}>
                      {q.origin === "extracted" ? "from paper" : "curated"}
                    </Badge>
                  </div>
                  {q.source && (
                    <p className="text-xs text-ink-3 mt-1.5">Adapted from {q.source}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
