import { notFound } from "next/navigation";
import { getPaper, getTutorClassrooms, getTutorStudents } from "@/lib/data";
import { PaperAssign } from "@/components/teach/PaperAssign";

export const metadata = { title: "Paper · Atlas" };
export const dynamic = "force-dynamic";

export default async function TeachPaperPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  const [paper, classes, students] = await Promise.all([
    getPaper(resourceId),
    getTutorClassrooms(),
    getTutorStudents(),
  ]);
  if (!paper) notFound();

  return (
    <PaperAssign
      paper={paper}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      students={students}
    />
  );
}
