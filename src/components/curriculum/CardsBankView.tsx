import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { FlashcardTopic } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/** Per-topic curated-flashcard counts, so admins can see coverage and review
 * any deck in place — without entering the student /cards experience. */
export function CardsBankView({
  topics,
  base,
}: {
  topics: FlashcardTopic[];
  base: string;
}) {
  if (topics.length === 0) {
    return (
      <Card className="p-8 text-center text-ink-2">
        No curriculum loaded yet. Run the seed to populate topics.
      </Card>
    );
  }

  const bySubject = new Map<string, FlashcardTopic[]>();
  for (const t of topics) {
    const list = bySubject.get(t.subject) ?? [];
    list.push(t);
    bySubject.set(t.subject, list);
  }

  return (
    <div className="space-y-6">
      {[...bySubject.entries()].map(([subject, ts]) => {
        const total = ts.reduce((n, t) => n + t.cardCount, 0);
        return (
          <Card key={subject} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-ink">{subject}</h2>
              <p className="text-sm text-ink-3">{total} cards</p>
            </div>
            <ul className="divide-y divide-hairline">
              {ts.map((t) => (
                <li key={t.topicId}>
                  <Link
                    href={`${base}/${t.topicId}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 gap-3 rounded-[10px] hover:bg-surface-2 transition-colors"
                  >
                    <span className="text-[15px] text-ink">{t.topicName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge tone={t.cardCount > 0 ? "accent" : "neutral"}>
                        {t.cardCount} {t.cardCount === 1 ? "card" : "cards"}
                      </Badge>
                      <ChevronRight size={16} className="text-ink-3" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
