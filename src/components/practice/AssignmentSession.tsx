"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Sparkles, X } from "lucide-react";
import type { AssignmentDetail } from "@/lib/data";
import type { MarkResult } from "@/lib/gemini";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { submitAssignment } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

type QState = { answer: string; result: MarkResult | null; marking: boolean; open: boolean };

export function AssignmentSession({ assignment }: { assignment: AssignmentDetail }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, QState>>(() =>
    Object.fromEntries(
      assignment.questions.map((q) => [q.id, { answer: "", result: null, marking: false, open: false }])
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(assignment.status === "submitted");

  const totals = useMemo(() => {
    let awarded = 0;
    let max = 0;
    let marked = 0;
    for (const q of assignment.questions) {
      const r = states[q.id]?.result;
      max += q.marks ?? 0;
      if (r) {
        awarded += r.awarded;
        marked += 1;
      }
    }
    return { awarded, max, marked };
  }, [states, assignment.questions]);

  const allMarked = totals.marked === assignment.questions.length;

  function set(id: string, patch: Partial<QState>) {
    setStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  async function mark(id: string) {
    const st = states[id];
    if (!st.answer.trim() || st.marking) return;
    set(id, { marking: true });
    try {
      const res = await fetch("/api/mark-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, answer: st.answer }),
      });
      const data = await res.json();
      if (res.ok) set(id, { result: data, open: false });
      else set(id, { result: { awarded: 0, max: 0, missingPoints: [], awardedPoints: [], errorType: "none", modelAnswer: "", improvedAnswer: "", feedback: data.error ?? "Marking failed." } });
    } finally {
      set(id, { marking: false });
    }
  }

  async function submit() {
    setSubmitting(true);
    const res = await submitAssignment(assignment.id, totals.awarded, totals.max);
    setSubmitting(false);
    if (!res.error) {
      setDone(true);
      router.refresh();
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="h-16 w-16 mx-auto rounded-full bg-mint/15 grid place-items-center mb-6">
          <Check className="text-mint" size={30} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">Submitted</h2>
        <p className="text-ink-2 mb-6">
          You scored {totals.awarded}/{totals.max}. Your tutor can see your result.
        </p>
        <Button onClick={() => router.push("/learn")}>Back to home</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {assignment.questions.map((q, i) => {
        const st = states[q.id];
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
              {q.marks ? (
                <span className="text-sm text-ink-2 shrink-0">
                  [{q.marks} {q.marks === 1 ? "mark" : "marks"}]
                </span>
              ) : null}
            </div>
            <p className="text-[15px] text-ink mb-3">{q.stem}</p>

            <textarea
              value={st.answer}
              onChange={(e) => set(q.id, { answer: e.target.value })}
              disabled={!!r}
              rows={4}
              placeholder="Write your answer…"
              className="w-full rounded-[14px] border border-hairline bg-surface-2 p-3 text-[15px] text-ink outline-none focus:border-accent resize-none disabled:opacity-70"
            />

            {!r ? (
              <Button
                size="sm"
                className="mt-3"
                disabled={!st.answer.trim() || st.marking}
                onClick={() => mark(q.id)}
              >
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
                {r.feedback && (
                  <p className="text-sm text-ink-2 mt-2">{r.feedback}</p>
                )}
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
                            <p className="text-sm text-ink">{r.improvedAnswer}</p>
                          </div>
                        )}
                        {r.modelAnswer && (
                          <div className="rounded-[12px] border border-hairline p-3">
                            <p className="text-xs font-semibold uppercase text-ink-3 mb-1">
                              Model answer
                            </p>
                            <p className="text-sm text-ink-2">{r.modelAnswer}</p>
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
          {totals.marked}/{assignment.questions.length} marked ·{" "}
          <span className="tabular-nums">
            {totals.awarded}/{totals.max}
          </span>
        </span>
        <Button onClick={submit} disabled={!allMarked || submitting}>
          {submitting ? "Submitting…" : "Submit assignment"} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
