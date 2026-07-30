import { getGamification } from "@/lib/data";
import {
  ACHIEVEMENTS,
  earnedCount,
  levelFromXp,
  rankName,
} from "@/lib/gamification";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { clamp, cn } from "@/lib/utils";

export const metadata = { title: "Rewards · Atlas" };
export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const stats = await getGamification();
  const lvl = levelFromXp(stats.xp);
  const earned = earnedCount(stats);

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">Rewards</h1>
        <p className="text-ink-2 mt-1">
          Level up as you study. {earned} of {ACHIEVEMENTS.length} badges earned.
        </p>
      </header>

      {/* Level card */}
      <Card className="p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
        <ProgressRing
          value={lvl.pct}
          label={`Lv ${lvl.level}`}
          sublabel={rankName(lvl.level)}
        />
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">
              {stats.xp.toLocaleString()} XP
            </span>
            <span className="text-sm text-ink-3">
              {lvl.into}/{lvl.forNext} to level {lvl.level + 1}
            </span>
          </div>
          <MasteryBar value={lvl.pct} />
          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <Stat label="Streak" value={`${stats.currentStreak}🔥`} />
            <Stat label="Answered" value={String(stats.attempts)} />
            <Stat label="Full marks" value={String(stats.fullMarks)} />
          </div>
        </div>
      </Card>

      {/* Badges */}
      <h2 className="text-lg font-semibold text-ink mb-4">Badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map((a) => {
          const value = a.value(stats);
          const done = value >= a.target;
          const pct = clamp((value / a.target) * 100);
          return (
            <Card
              key={a.id}
              className={cn("p-5 text-center", !done && "opacity-70")}
            >
              <div
                className={cn(
                  "h-14 w-14 mx-auto rounded-[18px] grid place-items-center text-2xl mb-3",
                  done ? "bg-accent-soft" : "bg-surface-2 grayscale"
                )}
              >
                {a.emoji}
              </div>
              <p className="font-semibold text-ink text-sm">{a.name}</p>
              <p className="text-xs text-ink-3 mt-1 mb-3 min-h-8">{a.desc}</p>
              {done ? (
                <span className="text-xs font-semibold text-accent">Earned</span>
              ) : (
                <>
                  <MasteryBar value={pct} />
                  <span className="text-xs text-ink-3 tabular-nums mt-1 block">
                    {Math.min(value, a.target)}/{a.target}
                  </span>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold text-ink tabular-nums">{value}</p>
      <p className="text-xs text-ink-3 mt-0.5">{label}</p>
    </div>
  );
}
