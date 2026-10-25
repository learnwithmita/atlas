import { getFlashcardBank } from "@/lib/data";
import { CardsBankView } from "@/components/curriculum/CardsBankView";

export const metadata = { title: "Flashcards · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const topics = await getFlashcardBank();
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Flashcards</h1>
        <p className="text-ink-2 mt-1">
          Every shared deck, by topic. See which topics have cards and review
          them here — no need to open the student view.
        </p>
      </header>
      <CardsBankView topics={topics} base="/admin/cards" />
    </div>
  );
}
