import { FileText } from "lucide-react";
import { getFullCurriculum, getResources } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadResource } from "@/components/admin/UploadResource";

export const metadata = { title: "Uploads · Atlas Admin" };
export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

const statusTone: Record<string, "neutral" | "accent" | "mint" | "flame"> = {
  uploaded: "accent",
  processing: "flame",
  review: "flame",
  approved: "mint",
  rejected: "neutral",
};

export default async function AdminContentPage() {
  const [resources, subjects] = await Promise.all([
    getResources(),
    getFullCurriculum(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <p className="text-sm text-ink-3">Platform</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">Uploads</h1>
        <p className="text-ink-2 mt-1">
          Upload the SEAB syllabus, past papers and mark schemes. Files are
          stored privately and queued for review.
        </p>
      </header>

      <Card className="p-6 mb-6">
        <UploadResource subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
      </Card>

      <Card className="p-2 mb-6 bg-accent-soft border-0">
        <p className="text-sm text-ink px-3 py-2">
          <strong>Next pipeline:</strong> automatic OCR → question extraction →
          outcome mapping isn&apos;t wired yet, so uploads stay in{" "}
          <em>uploaded</em> for now. They&apos;re safely stored and ready for
          that step.
        </p>
      </Card>

      <h2 className="text-lg font-semibold text-ink mb-3">Library</h2>
      {resources.length === 0 ? (
        <Card className="p-8 text-center text-ink-2">
          Nothing uploaded yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-4">
              <span className="h-10 w-10 shrink-0 rounded-[12px] bg-surface-2 grid place-items-center">
                <FileText size={18} className="text-ink-2" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-ink truncate">
                  {r.title}
                </p>
                <p className="text-xs text-ink-3">
                  {r.type.replace("_", " ")}
                  {r.subject ? ` · ${r.subject}` : ""} · {fmtSize(r.file_size)} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("en-SG")}
                </p>
              </div>
              <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
