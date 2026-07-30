/** XP → level. Flat 100 XP per level keeps it predictable and legible. */
export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, forNext: XP_PER_LEVEL, pct: Math.round((into / XP_PER_LEVEL) * 100) };
}

export function rankName(level: number): string {
  if (level >= 50) return "Master";
  if (level >= 35) return "Expert";
  if (level >= 20) return "Adept";
  if (level >= 10) return "Scholar";
  if (level >= 5) return "Apprentice";
  return "Novice";
}

export type GamiStats = {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  attempts: number;
  fullMarks: number;
  maxMastery: number;
  submissions: number;
  cardReviews: number;
};

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  target: number;
  value: (s: GamiStats) => number;
};

/** Badges are derived from stats — earned when value >= target. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_steps", name: "First Steps", desc: "Answer your first question", emoji: "👣", target: 1, value: (s) => s.attempts },
  { id: "warming_up", name: "Warming Up", desc: "Answer 25 questions", emoji: "🔥", target: 25, value: (s) => s.attempts },
  { id: "century", name: "Century", desc: "Answer 100 questions", emoji: "💯", target: 100, value: (s) => s.attempts },
  { id: "sharp", name: "Sharpshooter", desc: "Score full marks 5 times", emoji: "🎯", target: 5, value: (s) => s.fullMarks },
  { id: "flawless", name: "Flawless", desc: "Score full marks 25 times", emoji: "✨", target: 25, value: (s) => s.fullMarks },
  { id: "streak_7", name: "On a Roll", desc: "Reach a 7-day streak", emoji: "📅", target: 7, value: (s) => s.longestStreak },
  { id: "streak_30", name: "Unstoppable", desc: "Reach a 30-day streak", emoji: "⚡", target: 30, value: (s) => s.longestStreak },
  { id: "xp_1k", name: "Grinder", desc: "Earn 1,000 XP", emoji: "🏅", target: 1000, value: (s) => s.xp },
  { id: "topic_master", name: "Topic Master", desc: "Reach 80% mastery in a topic outcome", emoji: "🧠", target: 80, value: (s) => s.maxMastery },
  { id: "homework_hero", name: "Homework Hero", desc: "Submit 5 assignments", emoji: "📚", target: 5, value: (s) => s.submissions },
  { id: "card_shark", name: "Card Shark", desc: "Review 50 flashcards", emoji: "🃏", target: 50, value: (s) => s.cardReviews },
];

export function earnedCount(s: GamiStats): number {
  return ACHIEVEMENTS.filter((a) => a.value(s) >= a.target).length;
}
