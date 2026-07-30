"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PaperView as PaperData } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createAssignment } from "@/app/(app)/teach/actions";
import { cn } from "@/lib/utils";

export function PaperAssign({
  paper,
  classes,
  students,
}: {
  paper: PaperData;
  classes: { id: string; name: string }[];
  students: { id: string; name: string; classroom: string }[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState(createAssignment, {});
  const allIds = paper.topics.flatMap((t) => t.questions.map((q) => q.id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-40 md:pb-8">
      <Link href="/teach/uploads" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6">
        <ArrowLeft size={16} /> Materials
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-ink">{paper.title}</h1>
        <p className="text-ink-2 mt-1">
          {paper.total} questions · tick the ones to assign.
        </p>
      </header>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ink">Topics tested</h2>
          <button
            onClick={() =>
              setSelected(selected.size === allIds.length ? new Set() : new Set(allIds))
            }
            className="text-sm font-medium text-accent"
          >
            {selected.size === allIds.length ? "Clear all" : "Select all"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {paper.topics.map((t) => (
            <Badge key={t.topicId ?? t.topicName} tone={t.topicId ? "accent" : "neutral"}>
              {t.topicName} · {t.questions.length}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {paper.topics.map((t) => (
          <div key={t.topicId ?? t.topicName}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-3 mb-3">
              {t.topicName}
            </h3>
            <div className="space-y-2">
              {t.questions.map((q) => {
                const on = selected.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    className={cn(
                      "w-full text-left rounded-[14px] border p-4 flex gap-3 transition-colors",
                      on ? "border-accent bg-accent-soft" : "border-hairline hover:border-accent/40"
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 shrink-0 rounded-[6px] border grid place-items-center mt-0.5",
                        on ? "bg-accent border-accent text-white" : "border-hairline"
                      )}
                    >
                      {on && "✓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      {q.number && (
                        <span className="font-mono text-xs text-ink-3 mr-2">{q.number}</span>
                      )}
                      <span className="text-[15px] text-ink">{q.stem}</span>
                      {q.marks ? (
                        <span className="text-xs text-ink-3"> [{q.marks}]</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Assign bar */}
      {selected.size > 0 && (
        <form
          action={action}
          className="fixed bottom-0 inset-x-0 md:left-64 border-t border-hairline bg-surface/95 backdrop-blur-xl p-4 z-20"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="qid" value={id} />
          ))}
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 grid sm:grid-cols-2 gap-2">
              <input
                name="title"
                placeholder="Assignment title"
                required
                className="h-10 px-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-sm text-ink sm:col-span-2"
              />
              <select
                name="classroom_id"
                required
                className="h-10 px-2 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-sm text-ink"
              >
                <option value="">Choose class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="student_id"
                className="h-10 px-2 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-sm text-ink"
              >
                <option value="">Whole class</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.classroom})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={pending} className="shrink-0">
              {pending ? "Assigning…" : `Assign ${selected.size}`}
            </Button>
          </div>
          {state?.error && (
            <p className="mx-auto max-w-3xl text-sm text-danger mt-2">{state.error}</p>
          )}
          {state?.ok && (
            <p className="mx-auto max-w-3xl text-sm text-mint mt-2">
              Assigned! Students will see it on their home screen.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
