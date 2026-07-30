import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getClassroom } from "@/lib/data";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Class · Atlas" };
export const dynamic = "force-dynamic";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const classroom = await getClassroom(classroomId);
  if (!classroom) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link href="/teach" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6">
        <ArrowLeft size={16} /> Classrooms
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{classroom.name}</h1>
          <p className="text-ink-2 mt-1 flex items-center gap-1.5">
            <Users size={15} /> {classroom.members.length} students
          </p>
        </div>
        <div className="rounded-[14px] bg-surface-2 px-4 py-3 text-right">
          <p className="text-xs text-ink-3">Invite code</p>
          <p className="font-mono text-lg font-semibold text-ink tracking-widest">
            {classroom.invite_code}
          </p>
        </div>
      </header>

      {classroom.members.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          No students yet. Share the invite code above — students join from their
          home screen.
        </Card>
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-hairline">
            {classroom.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <span className="h-9 w-9 shrink-0 rounded-full bg-accent grid place-items-center text-white text-sm font-semibold">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] text-ink font-medium truncate">{m.name}</p>
                  {m.email && <p className="text-xs text-ink-3 truncate">{m.email}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-sm text-ink-3 mt-6">
        Assign questions from an uploaded paper on the{" "}
        <Link href="/teach/uploads" className="text-accent hover:underline">
          Materials
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
