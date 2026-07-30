import { getPracticeQuestions } from "@/lib/data";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Practice · Atlas" };
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const questions = await getPracticeQuestions();

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-2">
          Connect Supabase to practise
        </h1>
        <p className="text-ink-2">
          Add your keys to <code>.env.local</code> and run the migrations +
          seed, then questions appear here and Atlas marks them with Gemini.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mx-auto max-w-2xl px-5 sm:px-8 pt-8">
        <h1 className="text-3xl font-semibold text-ink">Practice</h1>
        <p className="text-ink-2 mt-1">
          Answer in your own words. Atlas marks it like an examiner.
        </p>
      </header>
      <PracticeSession questions={questions} />
    </div>
  );
}
