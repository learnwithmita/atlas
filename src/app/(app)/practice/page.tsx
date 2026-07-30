import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getPracticeQuestions, getQuestionsForTopics } from "@/lib/data";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Practice · Atlas" };
export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topics?: string; n?: string }>;
}) {
  const { topics, n } = await searchParams;
  const topicIds = topics ? topics.split(",").filter(Boolean) : [];
  const count = Math.min(30, Math.max(1, Number(n) || 10));

  const questions =
    topicIds.length > 0
      ? await getQuestionsForTopics(topicIds, count)
      : await getPracticeQuestions();

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
      <header className="mx-auto max-w-2xl px-5 sm:px-8 pt-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">
            {topicIds.length > 0 ? "Your custom paper" : "Practice"}
          </h1>
          <p className="text-ink-2 mt-1">
            Answer in your own words. Atlas marks it like an examiner.
          </p>
        </div>
        <Link
          href="/practice/build"
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface-2 border border-hairline text-sm font-medium text-ink-2 hover:text-ink"
        >
          <SlidersHorizontal size={15} /> Build a paper
        </Link>
      </header>
      {questions.length === 0 ? (
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="text-ink-2">
            No questions found for that selection yet. Try different topics, or
            upload past papers so the bank fills up.
          </p>
          <Link href="/practice/build" className="text-accent font-medium mt-3 inline-block">
            Adjust selection
          </Link>
        </div>
      ) : (
        <PracticeSession questions={questions} />
      )}
    </div>
  );
}
