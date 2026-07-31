import { getFullCurriculum } from "@/lib/data";
import { PaperBuilder } from "@/components/practice/PaperBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Build a paper · Atlas" };
export const dynamic = "force-dynamic";

export default async function BuildPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-2">
          Connect Supabase to practise
        </h1>
        <p className="text-ink-2">Add your keys and run the migrations + seed.</p>
      </div>
    );
  }
  const subjects = await getFullCurriculum();
  return <PaperBuilder subjects={subjects} />;
}
