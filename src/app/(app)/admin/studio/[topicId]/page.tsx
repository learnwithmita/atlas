import Link from "next/link";
import { ArrowLeft, BookOpen, LayoutGrid } from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { hasSummary, summaryImageUrl } from "@/lib/summaries";
import { StudyStudio } from "@/components/admin/StudyStudio";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Study content · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const s = await getTopicStudio(topicId);
  const summary = hasSummary(topicId);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/admin/curriculum"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Curriculum
      </Link>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">{s.subject}</p>
          <h1 className="text-3xl font-semibold text-ink mt-1">{s.topicName}</h1>
          <p className="text-ink-2 mt-1">Flashcards & notes for this topic.</p>
        </div>
        <LinkButton href={`/admin/bank/${topicId}`} size="sm" variant="secondary">
          <BookOpen size={15} /> Questions
        </LinkButton>
      </header>
      {/* Summary sheet — authored offline (Figma) and committed, not generated
          here. Pro-tier content for students. Shown first. */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-[12px] bg-accent-soft grid place-items-center">
            <LayoutGrid size={19} className="text-accent" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Summary sheet</p>
            <p className="text-sm text-ink-2 mt-0.5">
              One-page visual summary. Pro content, published from the Figma
              workflow.
            </p>
            <p className="text-xs text-ink-3 mt-1">
              {summary ? "Published" : "Not published yet"}
            </p>
          </div>
        </div>
        {summary && (
          <figure className="mt-4 rounded-[12px] overflow-hidden border border-hairline bg-white">
            {/* Served by the Pro image route; admins can view it here on the admin side. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={summaryImageUrl(topicId)}
              alt={`${s.topicName} summary sheet`}
              className="w-full h-auto block"
            />
          </figure>
        )}
      </Card>

      <StudyStudio
        topicId={topicId}
        flashcardCount={s.flashcardCount}
        hasNotes={s.hasNotes}
        outcomeCount={s.outcomeCount}
        cards={s.cards}
      />
    </div>
  );
}
