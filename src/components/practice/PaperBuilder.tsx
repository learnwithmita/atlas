"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { CurriculumSubject } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  GeneratedPracticeSession,
  type GenQuestion,
} from "@/components/practice/GeneratedPracticeSession";
import { cn } from "@/lib/utils";

export function PaperBuilder({ subjects }: { subjects: CurriculumSubject[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GenQuestion[] | null>(null);

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  );

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function generate() {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/paper/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: [...picked], count }),
      });
      const data = await res.json();
      if (res.ok) setQuestions(data.questions);
      else setError(data.error ?? "Generation failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  // Practising a freshly generated paper.
  if (questions) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-ink">Your paper</h1>
          <p className="text-ink-2 mt-1">
            {questions.length} freshly generated questions. Answer each — Atlas
            marks like an examiner.
          </p>
        </header>
        <GeneratedPracticeSession
          questions={questions}
          onRegenerate={() => {
            setQuestions(null);
            generate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">Build a paper</h1>
        <p className="text-ink-2 mt-1">
          Preparing for WA2? Pick the topics your school is testing and Atlas
          writes a fresh, randomised paper each time.
        </p>
      </header>

      {/* Subject tabs */}
      <div className="flex gap-1.5 p-1 rounded-full bg-surface-2 w-fit mb-5">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubjectId(s.id)}
            className={cn(
              "h-9 px-5 rounded-full text-sm font-medium transition-all",
              s.id === subjectId ? "bg-surface text-ink shadow-sm" : "text-ink-2"
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-ink">Topics tested</p>
          <button
            onClick={() =>
              setPicked((prev) => {
                const ids = subject?.topics.map((t) => t.id) ?? [];
                const allOn = ids.every((id) => prev.has(id));
                const n = new Set(prev);
                ids.forEach((id) => (allOn ? n.delete(id) : n.add(id)));
                return n;
              })
            }
            className="text-sm font-medium text-accent"
          >
            {subject?.topics.every((t) => picked.has(t.id)) ? "Clear" : "All"}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {subject?.topics.map((t) => {
            const on = picked.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-[12px] border text-left text-sm transition-colors",
                  on ? "border-accent bg-accent-soft" : "border-hairline hover:border-accent/40"
                )}
              >
                <span
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-[5px] border grid place-items-center text-[10px]",
                    on ? "bg-accent border-accent text-white" : "border-hairline"
                  )}
                >
                  {on && "✓"}
                </span>
                <span className="text-ink">{t.name}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-ink">Number of questions</p>
          <span className="text-lg font-semibold text-accent tabular-nums">{count}</span>
        </div>
        <input
          type="range"
          min={5}
          max={20}
          step={5}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[color:var(--color-accent)]"
        />
      </Card>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <Button size="lg" className="w-full" disabled={picked.size === 0 || busy} onClick={generate}>
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Writing your paper…
          </>
        ) : (
          <>
            <Sparkles size={18} /> Generate paper ({picked.size} topic
            {picked.size === 1 ? "" : "s"})
          </>
        )}
      </Button>
      {busy && (
        <p className="text-center text-sm text-ink-3 mt-3">
          Atlas is writing {count} fresh questions — about 15 seconds.
        </p>
      )}
    </div>
  );
}
