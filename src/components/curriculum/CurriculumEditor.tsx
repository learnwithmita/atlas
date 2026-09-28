"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Sparkles, Trash2, X } from "lucide-react";
import type { CurriculumSubject } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  deleteCurriculumOutcome,
  deleteCurriculumSubject,
  deleteCurriculumSubtopic,
  deleteCurriculumTopic,
  renameCurriculumTopic,
  setTopicDiscipline,
  updateCurriculumOutcome,
} from "@/app/(app)/actions";

/** Editable syllabus tree for admins: rename topics/outcomes, delete anything. */
export function CurriculumEditor({ subjects }: { subjects: CurriculumSubject[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    start(async () => {
      const res = await fn();
      if (res?.error) alert(res.error);
      else {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function confirmDelete(label: string, fn: () => Promise<{ error?: string }>) {
    if (confirm(`Delete ${label}? This cannot be undone.`)) run(fn);
  }

  if (subjects.length === 0) {
    return (
      <Card className="p-8 text-center text-ink-2">
        No curriculum loaded. Upload a syllabus on the Syllabus page, or run{" "}
        <code>supabase/seed.sql</code>.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {subjects.map((subject) => {
        const outcomes = subject.topics.reduce((n, t) => n + t.outcomeCount, 0);
        const isCombined = subject.name.toLowerCase().includes("combined");
        return (
          <Card key={subject.id} className="p-6">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-xl font-semibold text-ink">{subject.name}</h2>
              <div className="flex items-center gap-2">
                {subject.code && <Badge tone="accent">Syllabus {subject.code}</Badge>}
                <button
                  onClick={() =>
                    confirmDelete(`the entire "${subject.name}" syllabus`, () =>
                      deleteCurriculumSubject(subject.id)
                    )
                  }
                  disabled={pending}
                  className="text-xs font-medium text-ink-3 hover:text-danger inline-flex items-center gap-1"
                >
                  <Trash2 size={13} /> Delete syllabus
                </button>
              </div>
            </div>
            <p className="text-sm text-ink-3 mb-5">
              {subject.topics.length} topics · {outcomes} learning outcomes
            </p>

            <div className="space-y-1.5">
              {subject.topics.map((topic) => (
                <details key={topic.id} className="group rounded-[12px] border border-hairline">
                  <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none select-none">
                    <ChevronRight
                      size={16}
                      className="text-ink-3 transition-transform group-open:rotate-90 shrink-0"
                    />
                    {editing === `t:${topic.id}` ? (
                      <span
                        className="flex-1 flex items-center gap-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="flex-1 rounded-lg bg-surface-2 border border-hairline px-2 py-1 text-sm text-ink"
                          autoFocus
                        />
                        <button
                          onClick={() => run(() => renameCurriculumTopic(topic.id, draft))}
                          className="p-1 text-accent"
                          aria-label="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1 text-ink-3" aria-label="Cancel">
                          <X size={15} />
                        </button>
                      </span>
                    ) : (
                      <>
                        <span className="font-medium text-ink flex-1">{topic.name}</span>
                        <span className="text-xs text-ink-3 tabular-nums mr-1">
                          {topic.outcomeCount} outcomes
                        </span>
                        {isCombined && (
                          <select
                            value={topic.discipline ?? ""}
                            onClick={(e) => e.preventDefault()}
                            onChange={(e) =>
                              run(() => setTopicDiscipline(topic.id, e.target.value))
                            }
                            className="text-xs rounded-lg bg-surface-2 border border-hairline px-1.5 py-1 text-ink-2"
                            title="Discipline"
                          >
                            <option value="">— discipline</option>
                            <option value="biology">Biology</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="physics">Physics</option>
                          </select>
                        )}
                        <Link
                          href={`/admin/studio/${topic.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-ink-3 hover:text-accent inline-flex items-center gap-1 text-xs"
                          aria-label="Study content"
                          title="Flashcards & notes"
                        >
                          <Sparkles size={14} /> Content
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setEditing(`t:${topic.id}`);
                            setDraft(topic.name);
                          }}
                          className="p-1 text-ink-3 hover:text-ink"
                          aria-label="Rename topic"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            confirmDelete(`topic "${topic.name}"`, () =>
                              deleteCurriculumTopic(topic.id)
                            );
                          }}
                          className="p-1 text-ink-3 hover:text-danger"
                          aria-label="Delete topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </summary>
                  <div className="px-4 pb-4 pl-10 space-y-4">
                    {topic.subtopics.map((st) => (
                      <div key={st.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-ink-2 flex-1">{st.name}</p>
                          <button
                            onClick={() =>
                              confirmDelete(`subtopic "${st.name}"`, () =>
                                deleteCurriculumSubtopic(st.id)
                              )
                            }
                            className="p-1 text-ink-3 hover:text-danger"
                            aria-label="Delete subtopic"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {st.outcomes.map((o) => (
                            <li key={o.id} className="flex items-start gap-3 text-sm">
                              {o.code && (
                                <span className="shrink-0 font-mono text-xs text-accent bg-accent-soft rounded px-1.5 py-0.5 mt-0.5">
                                  {o.code}
                                </span>
                              )}
                              {editing === `o:${o.id}` ? (
                                <span className="flex-1 flex items-start gap-2">
                                  <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    rows={2}
                                    className="flex-1 rounded-lg bg-surface-2 border border-hairline px-2 py-1 text-sm text-ink"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => run(() => updateCurriculumOutcome(o.id, draft))}
                                    className="p-1 text-accent"
                                    aria-label="Save"
                                  >
                                    <Check size={15} />
                                  </button>
                                  <button onClick={() => setEditing(null)} className="p-1 text-ink-3" aria-label="Cancel">
                                    <X size={15} />
                                  </button>
                                </span>
                              ) : (
                                <>
                                  <span className="text-ink flex-1">{o.statement}</span>
                                  <button
                                    onClick={() => {
                                      setEditing(`o:${o.id}`);
                                      setDraft(o.statement);
                                    }}
                                    className="p-1 text-ink-3 hover:text-ink shrink-0"
                                    aria-label="Edit outcome"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      confirmDelete("this outcome", () =>
                                        deleteCurriculumOutcome(o.id)
                                      )
                                    }
                                    className="p-1 text-ink-3 hover:text-danger shrink-0"
                                    aria-label="Delete outcome"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
