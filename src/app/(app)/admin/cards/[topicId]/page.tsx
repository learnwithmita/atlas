import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { MathText } from "@/components/ui/MathText";

export const metadata = { title: "Topic flashcards · Atlas Admin" };
export const dynamic = "force-dynamic";

/** Read-only review of a topic's shared deck, inside the admin UI. */
export default async function AdminTopicCardsPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const s = await getTopicStudio(topicId);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/admin/cards"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Flashcards
      </Link>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">{s.subject}</p>
          <h1 className="text-3xl font-semibold text-ink mt-1">{s.topicName}</h1>
          <p className="text-ink-2 mt-1">
            {s.cards.length} shared card{s.cards.length === 1 ? "" : "s"} in this
            deck.
          </p>
        </div>
        <LinkButton href={`/admin/studio/${topicId}`} size="sm" variant="secondary">
          Manage
        </LinkButton>
      </header>

      {s.cards.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          No flashcards for this topic yet. Generate a deck from the topic
          studio.
        </Card>
      ) : (
        <Card className="p-5">
          <div className="divide-y divide-hairline">
            {s.cards.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <span className="text-xs text-ink-3 tabular-nums w-6 shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    <MathText>{c.front}</MathText>
                  </p>
                  <p className="text-sm text-ink-2 mt-0.5">
                    <MathText>{c.back}</MathText>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
