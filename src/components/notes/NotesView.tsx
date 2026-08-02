"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Sparkles } from "lucide-react";
import type { TopicNotesView } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MathText } from "@/components/ui/MathText";
import { saveStudentNotes } from "@/app/(app)/actions";

export function NotesView({
  topicId,
  data,
}: {
  topicId: string;
  data: TopicNotesView;
}) {
  const [notes, setNotes] = useState(data);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [content, setContent] = useState(data.studentNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const d = await res.json();
      if (res.ok)
        setNotes((n) => ({ ...n, keyPoints: d.keyPoints, misconceptions: d.misconceptions, hasNotes: true }));
      else setGenError(d.error ?? "Couldn't generate notes.");
    } catch {
      setGenError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await saveStudentNotes(topicId, content);
    setSaving(false);
    if (!res.error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Key points */}
      {!notes.hasNotes ? (
        <Card className="p-8 text-center">
          <div className="h-12 w-12 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
            <Sparkles className="text-accent" size={22} />
          </div>
          <p className="text-ink font-medium mb-1">No notes yet for this topic</p>
          <p className="text-ink-2 text-sm mb-5">
            Generate a quick revision sheet with key points and common
            misconceptions.
          </p>
          <Button onClick={generate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Writing notes…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate notes
              </>
            )}
          </Button>
          {genError && <p className="text-sm text-danger mt-3">{genError}</p>}
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Key points</h2>
            <ul className="space-y-2.5">
              {notes.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-2.5 text-ink-2 leading-relaxed">
                  <span className="text-accent mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-ink">
                    <MathText>{k}</MathText>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {notes.misconceptions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">
                Common misconceptions
              </h2>
              <div className="space-y-3">
                {notes.misconceptions.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-danger/25 bg-danger/[0.04] p-4"
                  >
                    <p className="flex items-start gap-2 text-ink font-medium">
                      <AlertTriangle size={17} className="text-danger mt-0.5 shrink-0" />
                      <MathText>{m.claim}</MathText>
                    </p>
                    <p className="text-ink-2 text-sm mt-1.5 pl-6">
                      <MathText>{m.correction}</MathText>
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Student's own notes */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Pencil size={16} className="text-accent" />
          <h2 className="text-lg font-semibold text-ink">My notes</h2>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Add your own points, mnemonics or reminders…"
          className="w-full rounded-[14px] border border-hairline bg-surface-2 p-4 text-[15px] text-ink outline-none focus:border-accent resize-y"
        />
        <div className="flex items-center gap-3 mt-3">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save notes"}
          </Button>
          {saved && (
            <span className="text-sm text-mint flex items-center gap-1">
              <Check size={15} /> Saved
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
