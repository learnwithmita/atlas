import { getFullCurriculum } from "@/lib/data";
import { CurriculumEditor } from "@/components/curriculum/CurriculumEditor";

export const metadata = { title: "Curriculum · Atlas Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage() {
  const subjects = await getFullCurriculum();
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Curriculum</h1>
        <p className="text-ink-2 mt-1">
          The SEAB syllabus spine powering the app. Rename or delete topics and
          outcomes, or remove a whole syllabus — e.g. strip the Physics topics
          that came in with Combined Science, or retire the old O-Level subject.
        </p>
      </header>
      <CurriculumEditor subjects={subjects} />
    </div>
  );
}
