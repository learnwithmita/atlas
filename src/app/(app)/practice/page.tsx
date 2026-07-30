import { getFullCurriculum } from "@/lib/data";
import { PaperBuilder } from "@/components/practice/PaperBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Practice · Atlas" };
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-2">
          Connect Supabase to practise
        </h1>
        <p className="text-ink-2">
          Add your keys to <code>.env.local</code> and run the migrations +
          seed, then Atlas can generate and mark questions.
        </p>
      </div>
    );
  }

  const subjects = await getFullCurriculum();
  return <PaperBuilder subjects={subjects} />;
}
