"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, RefreshCw, Sparkles, X } from "lucide-react";
import type { MarkResult } from "@/lib/gemini";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/ui/MathText";
import { recordActivity } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

export type GenQuestion = {
  id: string;
  stem: string;
  marks: number;
  type: string;
  commandWords: string[];
  topic: string;
  topicId: string | null;
};

type QState = { answer: string; result: MarkResult | null; marking: boolean; open: boolean };

function buildStates(qs: GenQuestion[]): Record<string, QState> {
  return Object.fromEntries(
    qs.map((q) => [q.id, { answer: "", result: null, marking: false, open: false }])
  );
}

export function GeneratedPracticeSession({
  questions,
  onRegenerate,
}: {
  questions: GenQuestion[];
  onRegenerate: () => void;
}) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, QState>>(() => buildStates(questions));
  const [done, setDone] = useState(false);

  // Reset when a new set of questions arrives (render-phase reset pattern) so
  // `states` always has an entry for every current question.
  const sig = questions.map((q) => q.id).join("|");
  const [prevSig, setPrevSig] = useState(sig);
  if (sig !== prevSig) {
    setPrevSig(sig);
    setStates(buildStates(questions));
    setDone(false);
  }

  const totals = useMemo(() => {
    let awarded = 0;
    let max = 0;
    let marked = 0;
    for (const q of questions) {
      max += q.marks;
      const r = states[q.id]?.result;
      if (r) {
        awarded += r.awarded;
        marked += 1;
      }
    }
    return { awarded, max, marked };
  }, [states, questions]);

  function set(id: string, patch: Partial<QState>) {
    setStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  const blank: QState = { answer: "", result: null, marking: false, open: false };

  async function mark(q: GenQuestion) {
    const st = states[q.id] ?? blank;
    if (!st.answer.trim() || st.marking) return;
    set(q.id, { marking: true });
    try {
      const res = await fetch("/api/mark-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stem: q.stem, marks: q.marks, answer: st.answer, topicId: q.topicId }),
      });
      const data = await res.json();
      if (res.ok) set(q.id, { result: data });
      else
        set(q.id, {
          result: { awarded: 0, max: q.marks, missingPoints: [], awardedPoints: [], errorType: "none", modelAnswer: "", improvedAnswer: "", feedback: data.error ?? "Marking failed." },
        });
    } finally {
      set(q.id, { marking: false });
    }
  }

  async function finish() {
    await recordActivity(10 + totals.awarded, 5);
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="h-16 w-16 mx-auto rounded-full bg-mint/15 grid place-items-center mb-6">
          <Check className="text-mint" size={30} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">Paper complete</h2>
        <p className="text-ink-2 mb-6">
          You scored {totals.awarded}/{totals.max}. Generate another for a fresh set.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={onRegenerate}>
            <RefreshCw size={16} /> New paper
          </Button>
          <Button variant="secondary" onClick={() => router.push("/learn")}>
            Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, i) => {
        const st = states[q.id] ?? blank;
        const r = st.result;
        return (
          <div key={q.id} className="rounded-[18px] border border-hairline bg-surface p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-ink-3">Q{i + 1}</span>
                {q.topic && <Badge>{q.topic}</Badge>}
                {q.commandWords.map((c) => (
                  <Badge key={c} tone="accent" className="capitalize">
                    {c}
                  </Badge>
                ))}
              </div>
              <span className="text-sm text-ink-2 shrink-0">
                [{q.marks} {q.marks === 1 ? "mark" : "marks"}]
              </span>
            </div>
            <p className="text-[15px] text-ink mb-3">
              <MathText>{q.stem}</MathText>
            </p>

            <textarea
              value={st.answer}
              onChange={(e) => set(q.id, { answer: e.target.value })}
              disabled={!!r}
              rows={4}
              placeholder="Write your answer…"
              className="w-full rounded-[14px] border border-hairline bg-surface-2 p-3 text-[15px] text-ink outline-none focus:border-accent resize-none disabled:opacity-70"
            />

            {!r ? (
              <Button size="sm" className="mt-3" disabled={!st.answer.trim() || st.marking} onClick={() => mark(q)}>
                {st.marking ? "Marking…" : "Mark my answer"}
              </Button>
            ) : (
              <div className="mt-3 rounded-[14px] bg-surface-2/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-semibold text-ink tabular-nums">
                    {r.awarded}
                    <span className="text-ink-3 text-base"> / {r.max}</span>
                  </span>
                  {r.errorType !== "none" && (
                    <Badge tone="flame">
                      <span className="capitalize">{r.errorType}</span>
                    </Badge>
                  )}
                </div>
                {r.awardedPoints.map((p, j) => (
                  <p key={`a${j}`} className="flex gap-2 text-sm text-ink mb-1">
                    <Check size={15} className="text-mint shrink-0 mt-0.5" /> {p}
                  </p>
                ))}
                {r.missingPoints.map((p, j) => (
                  <p key={`m${j}`} className="flex gap-2 text-sm text-ink-2 mb-1">
                    <X size={15} className="text-danger shrink-0 mt-0.5" /> {p}
                  </p>
                ))}
                {r.feedback && <p className="text-sm text-ink-2 mt-2">{r.feedback}</p>}
                {(r.improvedAnswer || r.modelAnswer) && (
                  <>
                    <button
                      onClick={() => set(q.id, { open: !st.open })}
                      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent"
                    >
                      <ChevronDown size={15} className={cn("transition-transform", st.open && "rotate-180")} />
                      {st.open ? "Hide" : "Show"} model answer
                    </button>
                    {st.open && (
                      <div className="mt-2 space-y-2">
                        {r.improvedAnswer && (
                          <div className="rounded-[12px] bg-accent-soft p-3">
                            <p className="text-xs font-semibold uppercase text-accent mb-1 flex items-center gap-1.5">
                              <Sparkles size={11} /> Your answer, improved
                            </p>
                            <p className="text-sm text-ink">
                              <MathText>{r.improvedAnswer}</MathText>
                            </p>
                          </div>
                        )}
                        {r.modelAnswer && (
                          <div className="rounded-[12px] border border-hairline p-3">
                            <p className="text-xs font-semibold uppercase text-ink-3 mb-1">Model answer</p>
                            <p className="text-sm text-ink-2">
                              <MathText>{r.modelAnswer}</MathText>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-[18px] border border-hairline bg-surface p-5 sticky bottom-4">
        <span className="text-ink font-medium">
          {totals.marked}/{questions.length} marked ·{" "}
          <span className="tabular-nums">
            {totals.awarded}/{totals.max}
          </span>
        </span>
        <Button onClick={finish} disabled={totals.marked === 0}>
          Finish <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
