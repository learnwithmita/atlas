import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Lightbulb,
  MessageCircle,
  PenLine,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type Misconception = { claim: string; correction: string };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ subtopicId: string }>;
}) {
  const { subtopicId } = await params;

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      `overview, simple_explanation, detailed_explanation, exam_tips, analogy, misconceptions,
       subtopic:subtopics ( name, topic:topics ( name, subject:subjects ( name ) ) )`
    )
    .eq("subtopic_id", subtopicId)
    .maybeSingle();

  if (!lesson) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const st = (lesson as any).subtopic;
  const misconceptions: Misconception[] = Array.isArray(lesson.misconceptions)
    ? (lesson.misconceptions as Misconception[])
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <article className="min-w-0 animate-fade-up">
          <p className="text-sm text-accent font-medium">
            {st?.topic?.name} · {st?.topic?.subject?.name}
          </p>
          <h1 className="text-4xl font-semibold text-ink mt-2 mb-6">
            {st?.name}
          </h1>

          <p className="text-lg text-ink-2 leading-relaxed mb-10">
            {lesson.overview}
          </p>

          <Section title="In simple terms">
            <p className="text-ink-2 leading-relaxed">
              {lesson.simple_explanation}
            </p>
          </Section>

          <Section title="The full picture">
            <p className="text-ink-2 leading-relaxed">
              {lesson.detailed_explanation}
            </p>
          </Section>

          {lesson.analogy && (
            <Card className="p-6 my-8 bg-accent-soft border-0">
              <CardEyebrow className="text-accent flex items-center gap-1.5">
                <Lightbulb size={13} /> Analogy
              </CardEyebrow>
              <p className="text-ink leading-relaxed">{lesson.analogy}</p>
            </Card>
          )}

          {misconceptions.length > 0 && (
            <Section title="Common misconceptions">
              <div className="space-y-3">
                {misconceptions.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-danger/25 bg-danger/[0.04] p-4"
                  >
                    <p className="flex items-start gap-2 text-ink font-medium">
                      <AlertTriangle
                        size={17}
                        className="text-danger mt-0.5 shrink-0"
                      />
                      {m.claim}
                    </p>
                    <p className="text-ink-2 text-sm mt-1.5 pl-6">
                      {m.correction}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {lesson.exam_tips && (
            <Card className="p-6 my-8 bg-ink-static text-white border-0">
              <CardEyebrow className="text-white/50 flex items-center gap-1.5">
                <Sparkles size={13} /> Examiner tips
              </CardEyebrow>
              <p className="leading-relaxed text-white/90">{lesson.exam_tips}</p>
            </Card>
          )}
        </article>

        {/* Right rail */}
        <aside className="lg:sticky lg:top-8 h-fit space-y-3">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink mb-3">Ready to test it?</p>
            <div className="space-y-2">
              <LinkButton href="/practice" className="w-full" size="sm">
                <PenLine size={16} /> Practice questions
              </LinkButton>
              <LinkButton
                href={`/tutor?topic=${encodeURIComponent(st?.name ?? "")}`}
                variant="secondary"
                className="w-full"
                size="sm"
              >
                <MessageCircle size={16} /> Ask the tutor
              </LinkButton>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-ink mb-3">{title}</h2>
      {children}
    </section>
  );
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink mb-2">
        Connect Supabase to load lessons
      </h1>
      <p className="text-ink-2">
        Add your keys to <code>.env.local</code> and run the migrations, then
        this lesson populates from your database.
      </p>
    </div>
  );
}
