import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTopicNotes } from "@/lib/data";
import { MathText } from "@/components/ui/MathText";
import { PrintButton } from "@/components/cards/PrintButton";

export const metadata = { title: "Print notes · Atlas" };
export const dynamic = "force-dynamic";

export default async function NotesPrintPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const data = await getTopicNotes(topicId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 print-sheet">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/learn/notes/${topicId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <PrintButton />
      </div>

      <header className="mb-6 border-b border-hairline pb-4">
        <h1 className="text-2xl font-bold text-ink">{data.topicName}</h1>
        <p className="text-ink-2 text-sm mt-0.5">{data.subject} · Revision notes</p>
      </header>

      {data.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.imageUrl}
          alt=""
          className="mb-6 max-h-80 w-auto border border-hairline bg-white break-inside-avoid"
        />
      )}

      {data.keyPoints.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-lg font-semibold text-ink mb-2">Key points</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            {data.keyPoints.map((p, i) => (
              <li key={i} className="text-ink leading-relaxed">
                <MathText>{p}</MathText>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.misconceptions.length > 0 && (
        <section className="break-inside-avoid">
          <h2 className="text-lg font-semibold text-ink mb-2">Common misconceptions</h2>
          <ul className="space-y-3">
            {data.misconceptions.map((m, i) => (
              <li key={i} className="break-inside-avoid">
                <p className="text-ink">
                  <span className="font-semibold">✗ </span>
                  <MathText>{m.claim}</MathText>
                </p>
                <p className="text-ink-2 pl-4">
                  <span className="font-semibold">✓ </span>
                  <MathText>{m.correction}</MathText>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.keyPoints.length === 0 && data.misconceptions.length === 0 && (
        <p className="text-ink-2">No notes yet — generate them from the study studio.</p>
      )}
    </div>
  );
}
