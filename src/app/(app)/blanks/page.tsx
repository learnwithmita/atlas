import Link from "next/link";
import { SquarePen } from "lucide-react";
import { getClozeDecks, getFullCurriculum } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { GenerateDeck } from "@/components/cards/GenerateDeck";
import { StudyModeTabs } from "@/components/cards/StudyModeTabs";

export const metadata = { title: "Fill the blanks · Atlas" };
export const dynamic = "force-dynamic";

export default async function BlanksPage() {
  const [decks, subjects] = await Promise.all([
    getClozeDecks(),
    getFullCurriculum(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Fill the blanks</h1>
          <p className="text-ink-2 mt-1">
            Type the missing keyword — active recall for exam phrasing.
          </p>
        </div>
        <GenerateDeck
          subjects={subjects}
          endpoint="/api/cloze/generate"
          label="Generate a set"
        />
      </header>

      <StudyModeTabs active="blanks" />

      {decks.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="h-14 w-14 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
            <SquarePen className="text-accent" size={26} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-1">No sets yet</h2>
          <p className="text-ink-2">
            Run the seed, or generate a set with AI above.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {decks.map((d) => (
            <Link key={d.subtopicId} href={`/blanks/${d.subtopicId}`} className="group">
              <Card className="p-5 h-full hover:border-accent transition-colors">
                <p className="font-semibold text-ink">{d.subtopicName}</p>
                <p className="text-xs text-ink-3 mt-0.5">
                  {d.topic} · {d.subject}
                </p>
                <p className="text-sm text-ink-3 mt-4">{d.total} sentences</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
