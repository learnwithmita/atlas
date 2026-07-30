import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStudyCards } from "@/lib/data";
import { FlashcardStudy } from "@/components/cards/FlashcardStudy";

export const metadata = { title: "Study · Atlas" };
export const dynamic = "force-dynamic";

export default async function StudyDeckPage({
  params,
}: {
  params: Promise<{ subtopicId: string }>;
}) {
  const { subtopicId } = await params;
  const { subtopicName, cards } = await getStudyCards(subtopicId);

  return (
    <div className="pt-6">
      <div className="mx-auto max-w-xl px-5 sm:px-8">
        <Link
          href="/cards"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> Decks
        </Link>
      </div>
      <FlashcardStudy subtopicName={subtopicName} cards={cards} />
    </div>
  );
}
