import Link from "next/link";
import { Layers, Printer } from "lucide-react";
import { getFlashcardDecks, getFullCurriculum, getProfile } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GenerateDeck } from "@/components/cards/GenerateDeck";
import { StudyModeTabs } from "@/components/cards/StudyModeTabs";

export const metadata = { title: "Flashcards · Atlas" };
export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const [decks, subjects, profile] = await Promise.all([
    getFlashcardDecks(),
    getFullCurriculum(),
    getProfile(),
  ]);
  const isStaff = profile?.role === "admin" || profile?.role === "tutor";
  const totalDue = decks.reduce((n, d) => n + d.due, 0);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Flashcards</h1>
          <p className="text-ink-2 mt-1">
            {totalDue > 0
              ? `${totalDue} cards due for review — spaced so they stick.`
              : "Spaced repetition keeps the keywords in long-term memory."}
          </p>
        </div>
        {isStaff && <GenerateDeck subjects={subjects} />}
      </header>

      <StudyModeTabs active="cards" />

      {decks.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="h-14 w-14 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
            <Layers className="text-accent" size={26} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-1">No decks yet</h2>
          <p className="text-ink-2">
            {isStaff
              ? "Run the seed for curated cards, or generate a deck with AI above."
              : "Your tutor is still preparing flashcards for your subjects — check back soon."}
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {decks.map((d) => (
            <Card key={d.subtopicId} className="p-5 h-full hover:border-accent transition-colors">
              <Link href={`/cards/${d.subtopicId}`} className="block group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{d.subtopicName}</p>
                    <p className="text-xs text-ink-3 mt-0.5">
                      {d.topic} · {d.subject}
                    </p>
                  </div>
                  {d.due > 0 ? (
                    <Badge tone="flame">{d.due} due</Badge>
                  ) : (
                    <Badge tone="mint">done</Badge>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-ink-3">{d.total} cards</span>
                <Link
                  href={`/cards/${d.subtopicId}/print`}
                  className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-accent"
                >
                  <Printer size={14} /> Print
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
