"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Layers,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "atlas_tour_v1";

const steps = [
  {
    icon: GraduationCap,
    title: "Welcome to Atlas",
    body: "Your AI-assisted, tutor-vetted study companion for G3 Biology and Chemistry. Here is a quick 30-second tour.",
  },
  {
    icon: PenLine,
    title: "Practice with instant marking",
    body: "Answer real exam-style questions and have them marked against the syllabus, with feedback on exactly what to improve.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    body: "Revise the key terms and definitions for each topic, tracked as you go so you know what still needs work.",
  },
  {
    icon: BookOpen,
    title: "Notes and study plan",
    body: "Work through in-depth notes topic by topic, and follow a study plan built around your syllabus.",
  },
  {
    icon: Sparkles,
    title: "Your AI marks",
    body: "You get a set number of AI-marked answers each day. Keep an eye on your balance in the sidebar, and upgrade any time for more.",
  },
];

export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* private mode / blocked storage: just don't show the tour */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const step = steps[i];
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div className="w-full max-w-sm rounded-[20px] bg-surface border border-hairline shadow-xl p-6">
        <div className="flex justify-end -mt-1 -mr-1">
          <button
            onClick={close}
            aria-label="Skip tour"
            className="p-1 text-ink-3 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-12 w-12 rounded-[14px] bg-accent-soft grid place-items-center text-accent mb-4">
          <Icon size={24} />
        </div>
        <h2 className="text-xl font-semibold text-ink">{step.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{step.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, k) => (
              <span
                key={k}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  k === i ? "w-5 bg-accent" : "w-1.5 bg-hairline"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="h-9 px-3 rounded-[10px] text-sm font-medium text-ink-2 hover:bg-surface-2 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (last ? close() : setI(i + 1))}
              className="h-9 px-4 rounded-[10px] text-sm font-semibold bg-accent text-white hover:opacity-90 transition-opacity"
            >
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
