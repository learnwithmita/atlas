import { getSyllabuses } from "@/lib/data";
import { SyllabusManager } from "@/components/admin/SyllabusManager";

export const metadata = { title: "Syllabus · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSyllabusPage() {
  const syllabuses = await getSyllabuses();

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Syllabus</h1>
        <p className="text-ink-2 mt-1">
          Upload an official SEAB syllabus PDF and Atlas builds its curriculum —
          topics, subtopics and learning outcomes — automatically.
        </p>
      </header>

      <SyllabusManager syllabuses={syllabuses} />
    </div>
  );
}
