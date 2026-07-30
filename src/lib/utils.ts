import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** SEAB-style grade bands derived from a 0–100 readiness/mastery score. */
export function toGrade(score: number): string {
  if (score >= 75) return "A1";
  if (score >= 70) return "A2";
  if (score >= 65) return "B3";
  if (score >= 60) return "B4";
  if (score >= 55) return "C5";
  if (score >= 50) return "C6";
  if (score >= 45) return "D7";
  if (score >= 40) return "E8";
  return "F9";
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}
