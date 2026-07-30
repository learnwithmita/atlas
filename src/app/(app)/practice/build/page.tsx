import { getFullCurriculum } from "@/lib/data";
import { PaperBuilder } from "@/components/practice/PaperBuilder";

export const metadata = { title: "Build a paper · Atlas" };
export const dynamic = "force-dynamic";

export default async function BuildPaperPage() {
  const subjects = await getFullCurriculum();
  return <PaperBuilder subjects={subjects} />;
}
