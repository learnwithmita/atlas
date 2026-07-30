import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAssignment } from "@/lib/data";
import { AssignmentSession } from "@/components/practice/AssignmentSession";

export const metadata = { title: "Assignment · Atlas" };
export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignment = await getAssignment(id);
  if (!assignment) notFound();

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Home
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">{assignment.title}</h1>
        <p className="text-ink-2 mt-1">
          {assignment.questions.length} questions · answer each and Atlas marks
          it like an examiner.
        </p>
      </header>
      <AssignmentSession assignment={assignment} />
    </div>
  );
}
