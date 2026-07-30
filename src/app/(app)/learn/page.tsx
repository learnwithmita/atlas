import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Target } from "lucide-react";
import { getStudentAssignments, getStudentDashboard } from "@/lib/data";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { StudyPlan } from "@/components/dashboard/StudyPlan";
import { ActivityStrip } from "@/components/dashboard/ActivityStrip";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { JoinClass } from "@/components/dashboard/JoinClass";
import { levelFromXp, rankName } from "@/lib/gamification";

export const metadata = { title: "Home · Atlas" };
export const dynamic = "force-dynamic";

export default async function LearnHome() {
  const [d, assignments] = await Promise.all([
    getStudentDashboard(),
    getStudentAssignments(),
  ]);
  const firstName = (d.profile?.full_name ?? "there").split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const goal = d.profile?.daily_goal_xp ?? 40;
  const todayXp = d.activity.find((a) => a.day === today)?.xp ?? 0;
  const goalPct = Math.min(100, Math.round((todayXp / goal) * 100));

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8 animate-fade-up flex items-end justify-between gap-4">
        <div>
          <p className="text-ink-3 text-sm">
            {new Date().toLocaleDateString("en-SG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-3xl font-semibold text-ink mt-1">
            Hello, {firstName}
          </h1>
        </div>
        {(() => {
          const lvl = levelFromXp(d.profile?.xp ?? 0);
          return (
            <Link
              href="/rewards"
              className="shrink-0 flex items-center gap-2.5 rounded-full border border-hairline bg-surface pl-2 pr-4 py-1.5 hover:border-accent transition-colors"
            >
              <span className="h-8 w-8 rounded-full bg-accent grid place-items-center text-white text-sm font-semibold">
                {lvl.level}
              </span>
              <span className="text-left leading-tight">
                <span className="block text-xs text-ink-3">
                  {rankName(lvl.level)}
                </span>
                <span className="block text-sm font-medium text-ink tabular-nums">
                  {d.profile?.xp ?? 0} XP
                </span>
              </span>
            </Link>
          );
        })()}
      </header>

      {/* Assignments from tutors */}
      {assignments.length > 0 && (
        <Card className="p-6 mb-5 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={19} className="text-accent" />
            <h2 className="text-lg font-semibold text-ink">
              Assignments from your tutor
            </h2>
          </div>
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/learn/assignments/${a.id}`}
                  className="flex items-center gap-4 p-3 rounded-[14px] hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink truncate">
                      {a.title}
                    </p>
                    <p className="text-xs text-ink-3">
                      {a.questionCount} questions
                      {a.classroom ? ` · ${a.classroom}` : ""}
                      {a.dueAt
                        ? ` · due ${new Date(a.dueAt).toLocaleDateString("en-SG")}`
                        : ""}
                    </p>
                  </div>
                  {a.status === "submitted" ? (
                    <Badge tone="mint">
                      {a.score ?? 0}/{a.maxScore ?? 0}
                    </Badge>
                  ) : (
                    <Badge tone="accent">To do</Badge>
                  )}
                  <ArrowRight size={16} className="text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!d.hasData ? (
        <EmptyState />
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: mastery + streak stats */}
          <Card className="lg:col-span-1 p-6 flex flex-col items-center animate-fade-up">
            <ProgressRing value={d.overallMastery} sublabel="mastery" />
            <div className="mt-6 w-full grid grid-cols-3 gap-3 text-center">
              <Stat label="Predicted" value={d.predictedGrade} accent />
              <Stat label="Readiness" value={`${d.readiness}%`} />
              <div>
                <div className="flex justify-center">
                  <StreakFlame days={d.profile?.current_streak ?? 0} size="lg" />
                </div>
                <p className="text-xs text-ink-3 mt-1">streak</p>
              </div>
            </div>

            <div className="w-full mt-6 pt-6 border-t border-hairline">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                  <Target size={15} className="text-accent" /> Today&apos;s goal
                </span>
                <span className="text-sm text-ink-3 tabular-nums">
                  {todayXp}/{goal} XP
                </span>
              </div>
              <MasteryBar value={goalPct} />
            </div>
          </Card>

          {/* Center + right: study plan */}
          <Card className="lg:col-span-2 p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-ink">Your study plan</h2>
              <Link
                href="/plan"
                className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
              >
                Full plan <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-sm text-ink-3 mb-5">
              Atlas decides what to study next — you don&apos;t have to.
            </p>
            <StudyPlan buckets={d.buckets} />
          </Card>

          {/* Activity */}
          <Card className="lg:col-span-2 p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">
                Last two weeks
              </h2>
              <Badge tone="flame">
                <StreakFlame days={d.profile?.current_streak ?? 0} size="sm" />
                best {d.profile?.longest_streak ?? 0}
              </Badge>
            </div>
            <ActivityStrip activity={d.activity} goal={goal} />
          </Card>

          {/* Continue */}
          <Card className="lg:col-span-1 p-6 animate-fade-up flex flex-col">
            <h2 className="text-lg font-semibold text-ink mb-1">
              Continue learning
            </h2>
            <p className="text-sm text-ink-3 mb-5">Picked for you</p>
            <Link
              href="/learn/bf832a31-5917-58bf-90b5-ec31d443a699"
              className="group rounded-[16px] border border-hairline p-4 hover:border-accent transition-colors"
            >
              <div className="h-10 w-10 rounded-[12px] bg-accent-soft grid place-items-center mb-3">
                <BookOpen size={20} className="text-accent" />
              </div>
              <p className="font-medium text-ink">Osmosis</p>
              <p className="text-sm text-ink-3 mt-0.5">
                Movement of Substances · Biology
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Resume <ArrowRight size={14} />
              </span>
            </Link>
          </Card>
        </div>
      )}

      {/* Join a class */}
      <Card className="p-5 mt-5 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <p className="font-medium text-ink">Have a class code?</p>
            <p className="text-sm text-ink-3">
              Join your tutor&apos;s class to get assignments.
            </p>
          </div>
          <div className="sm:w-72">
            <JoinClass />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-ink-3 mt-1">{label}</p>
    </div>
  );
}
