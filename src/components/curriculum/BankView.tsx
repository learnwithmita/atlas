import type { BankTopic } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/** Per-topic question counts (curated bank + extracted from papers). */
export function BankView({ topics }: { topics: BankTopic[] }) {
  if (topics.length === 0) {
    return (
      <Card className="p-8 text-center text-ink-2">
        No curriculum loaded yet. Run the seed to populate topics.
      </Card>
    );
  }

  const bySubject = new Map<string, BankTopic[]>();
  for (const t of topics) {
    const list = bySubject.get(t.subject) ?? [];
    list.push(t);
    bySubject.set(t.subject, list);
  }

  return (
    <div className="space-y-6">
      {[...bySubject.entries()].map(([subject, ts]) => {
        const bank = ts.reduce((n, t) => n + t.bankCount, 0);
        const ex = ts.reduce((n, t) => n + t.extractedCount, 0);
        return (
          <Card key={subject} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-ink">{subject}</h2>
              <p className="text-sm text-ink-3">
                {bank} bank · {ex} extracted
              </p>
            </div>
            <ul className="divide-y divide-hairline">
              {ts.map((t) => (
                <li
                  key={t.topicId}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <span className="text-[15px] text-ink">{t.topicName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={t.bankCount > 0 ? "accent" : "neutral"}>
                      {t.bankCount} bank
                    </Badge>
                    {t.extractedCount > 0 && (
                      <Badge tone="mint">{t.extractedCount} extracted</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
