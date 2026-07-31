import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { getPracticeHistory } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/ui/MathText";

export const metadata = { title: "Review · Atlas" };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const history = await getPracticeHistory();

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/practice"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Practice
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">Review</h1>
        <p className="text-ink-2 mt-1">
          Every question you&apos;ve practised, with your answer and the feedback.
        </p>
      </header>

      {history.length === 0 ? (
        <Card className="p-10 text-center text-ink-2">
          Nothing yet. Practise a topic and your attempts appear here.
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((h) => {
            const full = h.marks != null && Number(h.awarded) >= Number(h.marks);
            return (
              <Card key={h.id} className="p-0 overflow-hidden">
                <details className="group">
                  <summary className="flex items-center gap-3 p-4 cursor-pointer list-none">
                    <span
                      className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-semibold tabular-nums ${
                        full ? "bg-mint/15 text-mint" : "bg-surface-2 text-ink-2"
                      }`}
                    >
                      {h.awarded ?? 0}/{h.marks ?? 0}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] text-ink truncate">
                        <MathText>{h.stem}</MathText>
                      </p>
                      <p className="text-xs text-ink-3">
                        {h.topic ? `${h.topic} · ` : ""}
                        {new Date(h.createdAt).toLocaleDateString("en-SG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </summary>

                  <div className="px-4 pb-4 space-y-3 border-t border-hairline pt-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-ink-3 mb-1">
                        Your answer
                      </p>
                      <p className="text-sm text-ink-2">{h.answer || "—"}</p>
                    </div>

                    {h.awardedPoints.length > 0 && (
                      <ul className="space-y-1">
                        {h.awardedPoints.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-ink">
                            <Check size={15} className="text-mint shrink-0 mt-0.5" /> {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    {h.missingPoints.length > 0 && (
                      <ul className="space-y-1">
                        {h.missingPoints.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-ink-2">
                            <X size={15} className="text-danger shrink-0 mt-0.5" /> {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    {h.feedback && (
                      <p className="text-sm text-ink-2">{h.feedback}</p>
                    )}
                    {h.modelAnswer && (
                      <div className="rounded-[12px] border border-hairline p-3">
                        <p className="text-xs font-semibold uppercase text-ink-3 mb-1">
                          Model answer
                        </p>
                        <p className="text-sm text-ink-2">
                          <MathText>{h.modelAnswer}</MathText>
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
