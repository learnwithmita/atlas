import { getStudentCurriculum } from "@/lib/data";
import { getEntitlement } from "@/lib/entitlements";
import { PaperBuilder } from "@/components/practice/PaperBuilder";
import { SubjectSetup } from "@/components/dashboard/SubjectSetup";
import { UpgradeCard } from "@/components/pricing/UpgradeCard";
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
  const { subjects, needsOnboarding } = await getStudentCurriculum();
  if (needsOnboarding) {
    return (
      <div className="mx-auto max-w-lg px-5 sm:px-8 py-16">
        <SubjectSetup />
      </div>
    );
  }

  const ent = await getEntitlement();
  if (ent.tier !== "premium") {
    return (
      <div className="mx-auto max-w-lg px-5 sm:px-8 py-16">
        <UpgradeCard
          title="Build custom papers with Premium"
          body="Mix any topics into one WA paper. Practising one topic at a time is included on every plan — building full custom papers is a Premium feature."
        />
      </div>
    );
  }
  return <PaperBuilder subjects={subjects} />;
}
