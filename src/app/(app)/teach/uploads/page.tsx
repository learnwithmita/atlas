import { getFullCurriculum, getResources } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { UploadResource } from "@/components/admin/UploadResource";
import { ResourceCard } from "@/components/admin/ResourceCard";

export const metadata = { title: "Materials · Atlas" };
export const dynamic = "force-dynamic";

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
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} detailBase="/teach/uploads" />
          ))}
        </div>
      )}
    </div>
  );
}
