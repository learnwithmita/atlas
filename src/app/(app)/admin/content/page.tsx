import { getFullCurriculum, getResources } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { UploadResource } from "@/components/admin/UploadResource";
import { ResourceCard } from "@/components/admin/ResourceCard";

export const metadata = { title: "Uploads · Atlas Admin" };
export const dynamic = "force-dynamic";

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
        <UploadResource
          variant="admin"
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        />
      </Card>
      <p className="text-xs text-ink-3 -mt-4 mb-6 px-1">
        Admin uploads are visible to everyone on the platform.
      </p>

      <Card className="p-2 mb-6 bg-accent-soft border-0">
        <p className="text-sm text-ink px-3 py-2">
          <strong>Tip:</strong> after uploading a PDF or image, hit{" "}
          <em>Extract questions</em> — Atlas reads the paper, pulls out each
          question, and detects which syllabus topic it tests.
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
            <ResourceCard key={r.id} resource={r} detailBase="/admin/content" />
          ))}
        </div>
      )}
    </div>
  );
}
