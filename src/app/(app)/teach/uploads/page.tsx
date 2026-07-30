import { FileText, Globe, Lock, Users } from "lucide-react";
import { getFullCurriculum, getResources } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadResource } from "@/components/admin/UploadResource";

export const metadata = { title: "Materials · Atlas" };
export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

const vis = {
  public: { icon: Globe, label: "Platform", tone: "mint" as const },
  shared: { icon: Users, label: "Shared", tone: "accent" as const },
  private: { icon: Lock, label: "Only me", tone: "neutral" as const },
};

export default async function TeachUploadsPage() {
  const [resources, subjects] = await Promise.all([
    getResources(),
    getFullCurriculum(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">Materials</h1>
        <p className="text-ink-2 mt-1">
          Upload your own papers and notes. Keep them private, or share with all
          tutors. Platform materials from admins appear here too.
        </p>
      </header>

      <Card className="p-6 mb-8">
        <UploadResource
          variant="tutor"
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        />
      </Card>

      <h2 className="text-lg font-semibold text-ink mb-3">Your library</h2>
      {resources.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          Nothing here yet. Upload a past paper to get started.
        </Card>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const v = vis[r.visibility as keyof typeof vis] ?? vis.private;
            const VIcon = v.icon;
            return (
              <Card key={r.id} className="p-4 flex items-center gap-4">
                <span className="h-10 w-10 shrink-0 rounded-[12px] bg-surface-2 grid place-items-center">
                  <FileText size={18} className="text-ink-2" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink truncate">
                    {r.title}
                    {r.mine && (
                      <span className="text-ink-3 font-normal"> · yours</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-3">
                    {r.type.replace("_", " ")}
                    {r.subject ? ` · ${r.subject}` : ""} · {fmtSize(r.file_size)}
                  </p>
                </div>
                <Badge tone={v.tone}>
                  <VIcon size={12} /> {v.label}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-2 mt-6 bg-accent-soft border-0">
        <p className="text-sm text-ink px-3 py-2">
          <strong>Coming next:</strong> auto-extract questions from an uploaded
          paper (with topic detection) so you can assign specific questions to a
          class or student.
        </p>
      </Card>
    </div>
  );
}
