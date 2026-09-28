import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStudyCards } from "@/lib/data";
import { PrintButton } from "@/components/cards/PrintButton";
import { MathText } from "@/components/ui/MathText";

export const metadata = { title: "Print flashcards · Atlas" };
export const dynamic = "force-dynamic";

export default async function PrintDeckPage({
  params,
}: {
  params: Promise<{ subtopicId: string }>;
}) {
  const { subtopicId } = await params;
  const { subtopicName, cards } = await getStudyCards(subtopicId);

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 print-sheet">
      <div className="no-print flex items-center justify-between mb-6">
        <Link
          href={`/cards/${subtopicId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> Deck
        </Link>
        <PrintButton />
      </div>

      <h1 className="text-2xl font-semibold text-ink mb-1">{subtopicName}</h1>
      <p className="text-ink-3 text-sm mb-6">
        {cards.length} flashcards · fold or cut along the middle
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left">
            <th className="border border-hairline px-3 py-2 w-1/2 font-semibold text-ink">
              Term / Question
            </th>
            <th className="border border-hairline px-3 py-2 font-semibold text-ink">
              Answer / Definition
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id} style={{ breakInside: "avoid" }}>
              <td className="border border-hairline px-3 py-2.5 align-top text-ink font-medium">
                <MathText>{c.front}</MathText>
              </td>
              <td className="border border-hairline px-3 py-2.5 align-top text-ink-2">
                <MathText>{c.back}</MathText>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
