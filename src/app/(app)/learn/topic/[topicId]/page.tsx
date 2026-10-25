import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookText,
  Layers,
  LayoutGrid,
  Lock,
  PenLine,
} from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { getEntitlement } from "@/lib/entitlements";
import { hasSummary } from "@/lib/summaries";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Study topic · Atlas" };
export const dynamic = "force-dynamic";

/**
 * Student study hub for a single topic: the intended path is
 * Notes → Summary → Flashcards → Practise. Reached from the Study Plan, so a
 * topic opens into *studying* it, not straight into questions.
 *
 * The Summary row is the Pro slot; it stays a placeholder until summary sheets
 * are wired into the app (step 3 of the content rollout).
 */
export default async function TopicStudyPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const [t, ent] = await Promise.all([getTopicStudio(topicId), getEntitlement()]);
  if (!t.topicName) notFound();

  const summaryReady = hasSummary(topicId);
  const canSeeSummary = ent.isPro;

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/plan"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Study plan
      </Link>

      <header className="mb-6">
        <p className="text-sm text-ink-3">{t.subject}</p>
        <h1 className="text-3xl font-semibold text-ink mt-1">{t.topicName}</h1>
        <p className="text-ink-2 mt-1">
          Work through the topic, then put it to the test.
        </p>
      </header>

      <div className="space-y-3">
        {/* 1 — Notes (free) */}
        <StepCard
          n={1}
          icon={BookText}
          title="Revision notes"
          desc="The full topic, explained in exam wording with the common traps called out."
          status={t.hasNotes ? "Ready to read" : "Not available yet"}
        >
          {t.hasNotes ? (
            <LinkButton href={`/learn/notes/${topicId}`} size="sm">
              Read notes
            </LinkButton>
          ) : null}
        </StepCard>

        {/* 2 — Summary sheet (Pro) */}
        <StepCard
          n={2}
          icon={canSeeSummary ? LayoutGrid : Lock}
          title="Summary sheet"
          desc="A one-page visual map of the whole topic — the big picture at a glance."
          status={
            !canSeeSummary
              ? "Pro feature"
              : summaryReady
                ? "Ready to view"
                : "Being added for this topic"
          }
          pro
        >
          {!canSeeSummary ? (
            <LinkButton href="/pricing" size="sm" variant="secondary">
              Upgrade to Pro
            </LinkButton>
          ) : summaryReady ? (
            <LinkButton href={`/learn/summary/${topicId}`} size="sm">
              View summary
            </LinkButton>
          ) : null}
        </StepCard>

        {/* 3 — Flashcards (free) */}
        <StepCard
          n={3}
          icon={Layers}
          title="Flashcards"
          desc="Drill the key terms and definitions until they stick."
          status={
            t.flashcardCount > 0
              ? `${t.flashcardCount} card${t.flashcardCount === 1 ? "" : "s"}`
              : "Not available yet"
          }
        >
          {t.flashcardCount > 0 && t.firstSubtopicId ? (
            <LinkButton href={`/cards/${t.firstSubtopicId}`} size="sm">
              Study flashcards
            </LinkButton>
          ) : null}
        </StepCard>

        {/* 4 — Practise (the pay-off) */}
        <StepCard
          n={4}
          icon={PenLine}
          title="Practise this topic"
          desc="Exam-style questions, marked instantly against the syllabus."
          status={`${t.outcomeCount} learning outcome${t.outcomeCount === 1 ? "" : "s"}`}
          primary
        >
          <LinkButton href={`/practice/topic/${topicId}`} size="sm">
            Start practising
          </LinkButton>
        </StepCard>
      </div>
    </div>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  desc,
  status,
  pro,
  primary,
  children,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  status: string;
  pro?: boolean;
  primary?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className={primary ? "p-5 border-accent/40" : "p-5"}>
      <div className="flex items-start gap-4">
        <span className="h-8 w-8 shrink-0 rounded-full bg-surface-2 grid place-items-center text-sm font-semibold text-ink-2 tabular-nums">
          {n}
        </span>
        <div className="h-10 w-10 shrink-0 rounded-[12px] bg-accent-soft grid place-items-center">
          <Icon size={19} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink">{title}</p>
            {pro && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-accent bg-accent-soft rounded-full px-2 py-0.5">
                Pro
              </span>
            )}
          </div>
          <p className="text-sm text-ink-2 mt-0.5">{desc}</p>
          <p className="text-xs text-ink-3 mt-1">{status}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </Card>
  );
}
