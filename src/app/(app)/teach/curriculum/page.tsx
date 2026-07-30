import { getFullCurriculum } from "@/lib/data";
import { CurriculumTree } from "@/components/curriculum/CurriculumTree";

export const metadata = { title: "Curriculum · Atlas" };
export const dynamic = "force-dynamic";

export default async function TeachCurriculumPage() {
  const subjects = await getFullCurriculum();
  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">Curriculum</h1>
        <p className="text-ink-2 mt-1">
          The full SEAB syllabus — topics and learning outcomes your students
          are assessed on. View only.
        </p>
      </header>
      <CurriculumTree subjects={subjects} />
    </div>
  );
}
