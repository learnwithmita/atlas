import Link from "next/link";
import { ChevronRight, FileText, History, SlidersHorizontal } from "lucide-react";
import { getFullCurriculum } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Practice · Atlas" };
export const dynamic = "force-dynamic";

export default async function PracticeHub() {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-2">
          Connect Supabase to practise
        </h1>
        <p className="text-ink-2">
          Add your keys to <code>.env.local</code> and run the migrations + seed.
        </p>
      </div>
    );
  }

  const subjects = await getFullCurriculum();

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">Practice</h1>
        <p className="text-ink-2 mt-1">
          Drill one topic, build a full paper, or review your past answers.
        </p>
      </header>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <Link href="/practice/build" className="group">
          <Card className="p-5 h-full hover:border-accent transition-colors flex items-center gap-4">
            <span className="h-11 w-11 shrink-0 rounded-[14px] bg-accent-soft grid place-items-center">
              <SlidersHorizontal size={20} className="text-accent" />
            </span>
            <div>
              <p className="font-semibold text-ink">Build a WA paper</p>
              <p className="text-sm text-ink-3">Mix several topics into one paper</p>
            </div>
          </Card>
        </Link>
        <Link href="/practice/review" className="group">
          <Card className="p-5 h-full hover:border-accent transition-colors flex items-center gap-4">
            <span className="h-11 w-11 shrink-0 rounded-[14px] bg-surface-2 grid place-items-center">
              <History size={20} className="text-ink-2" />
            </span>
            <div>
              <p className="font-semibold text-ink">Review answers</p>
              <p className="text-sm text-ink-3">See what you wrote + feedback</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Topical practice */}
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-ink-2" />
        <h2 className="text-lg font-semibold text-ink">Practice by topic</h2>
      </div>
      <div className="space-y-6">
        {subjects.map((s) => (
          <div key={s.id}>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-3 mb-2">
              {s.name}
            </p>
            <Card className="p-2">
              <ul className="divide-y divide-hairline">
                {s.topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/practice/topic/${t.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-3 rounded-[12px] hover:bg-surface-2 transition-colors"
                    >
                      <span className="text-[15px] text-ink">{t.name}</span>
                      <ChevronRight size={16} className="text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
