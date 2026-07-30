import type { DailyActivity } from "@/lib/data";
import { clamp } from "@/lib/utils";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** Last-14-days XP bars — quiet, premium, no cartoon colours. */
export function ActivityStrip({
  activity,
  goal,
}: {
  activity: DailyActivity[];
  goal: number;
}) {
  const byDay = new Map(activity.map((a) => [a.day, a]));
  const days: { date: Date; xp: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, xp: byDay.get(key)?.xp ?? 0 });
  }
  const max = Math.max(goal, ...days.map((d) => d.xp), 1);

  return (
    <div className="flex items-end gap-1.5 h-28">
      {days.map((d, i) => {
        const h = clamp((d.xp / max) * 100, d.xp > 0 ? 8 : 3, 100);
        const hitGoal = d.xp >= goal;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${h}%`,
                  background: hitGoal
                    ? "linear-gradient(180deg, var(--color-accent), var(--color-accent-strong))"
                    : "var(--color-surface-2)",
                }}
                title={`${d.xp} XP`}
              />
            </div>
            <span className="text-[10px] text-ink-3">
              {DOW[d.date.getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
