import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { StudyStudio } from "@/components/admin/StudyStudio";

export const metadata = { title: "Study content · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const s = await getTopicStudio(topicId);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/admin/curriculum"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Curriculum
      </Link>
      <header className="mb-6">
        <p className="text-sm text-ink-3">{s.subject}</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">{s.topicName}</h1>
        <p className="text-ink-2 mt-1">Study content for this topic.</p>
      </header>
      <StudyStudio
        topicId={topicId}
        flashcardCount={s.flashcardCount}
        hasNotes={s.hasNotes}
        outcomeCount={s.outcomeCount}
        firstSubtopicId={s.firstSubtopicId}
      />
    </div>
  );
}
