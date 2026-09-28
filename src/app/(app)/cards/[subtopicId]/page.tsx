import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getEditableCards,
  getProfile,
  getStudyCards,
  getTutorClassrooms,
} from "@/lib/data";
import { FlashcardStudy } from "@/components/cards/FlashcardStudy";
import { DeckEditor } from "@/components/cards/DeckEditor";

export const metadata = { title: "Study · Atlas" };
export const dynamic = "force-dynamic";

export default async function StudyDeckPage({
  params,
}: {
  params: Promise<{ subtopicId: string }>;
}) {
  const { subtopicId } = await params;
  const [{ subtopicName, cards }, profile, editable] = await Promise.all([
    getStudyCards(subtopicId),
    getProfile(),
    getEditableCards(subtopicId),
  ]);

  const role = (profile?.role ?? "student") as "student" | "tutor" | "admin";
  const classrooms =
    role === "tutor" || role === "admin"
      ? (await getTutorClassrooms()).map((c) => ({ id: c.id, name: c.name }))
      : [];

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
      <DeckEditor
        subtopicId={subtopicId}
        cards={editable}
        role={role}
        classrooms={classrooms}
      />
    </div>
  );
}
