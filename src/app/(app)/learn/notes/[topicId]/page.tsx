import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { getTopicNotes } from "@/lib/data";
import { NotesView } from "@/components/notes/NotesView";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Notes · Atlas" };
export const dynamic = "force-dynamic";

export default async function TopicNotesPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const data = await getTopicNotes(topicId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/practice"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Practice
      </Link>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-3">{data.subject}</p>
          <h1 className="text-3xl font-semibold text-ink mt-1">{data.topicName}</h1>
          <p className="text-ink-2 mt-1">Revision notes for this topic.</p>
        </div>
        <LinkButton href={`/practice/topic/${topicId}`} size="sm" variant="secondary">
          <PenLine size={15} /> Practise
        </LinkButton>
      </header>
      <NotesView topicId={topicId} data={data} />
    </div>
  );
}
