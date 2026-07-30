import { Copy, Users } from "lucide-react";
import { getFullCurriculum, getTutorClassrooms } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateClassroom } from "@/components/teach/CreateClassroom";

export const metadata = { title: "Classrooms · Atlas" };
export const dynamic = "force-dynamic";

export default async function TeachHome() {
  const [classrooms, subjects] = await Promise.all([
    getTutorClassrooms(),
    getFullCurriculum(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Classrooms</h1>
          <p className="text-ink-2 mt-1">
            Create a class, share the code, and track your students.
          </p>
        </div>
        <CreateClassroom subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
      </header>

      {classrooms.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="h-14 w-14 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
            <Users className="text-accent" size={26} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-1">
            No classes yet
          </h2>
          <p className="text-ink-2">
            Create your first class — students join with the invite code and
            appear here.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {classrooms.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink text-lg">{c.name}</h3>
                {c.subject && <Badge tone="accent">{c.subject}</Badge>}
              </div>
              <p className="text-sm text-ink-3 mt-1 flex items-center gap-1.5">
                <Users size={14} /> {c.memberCount} student
                {c.memberCount === 1 ? "" : "s"}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-[12px] bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-xs text-ink-3">Invite code</p>
                  <p className="font-mono text-lg font-semibold text-ink tracking-widest">
                    {c.invite_code}
                  </p>
                </div>
                <Copy size={16} className="text-ink-3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-ink-3 mt-6">
        Coming next: student roster, assigning question sets, and per-class
        mastery heatmaps.
      </p>
    </div>
  );
}
