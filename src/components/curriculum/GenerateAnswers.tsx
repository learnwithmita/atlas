"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, KeyRound, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Admin control: generate model answers + mark schemes for a topic's extracted
 * paper questions (they have none by default), so they show "Show answer".
 */
export function GenerateAnswers({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"answers" | "diagrams" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(kind: "answers" | "diagrams") {
    setBusy(kind);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/extract/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (res.ok) {
        const noun = kind === "answers" ? "answers" : "diagrams";
        setMsg(
          data.added > 0
            ? `Generated ${noun} for ${data.added} question${data.added === 1 ? "" : "s"}.${data.remaining ? ` ${data.remaining} left — run again.` : ""}`
            : data.message ?? "Nothing to do."
        );
        router.refresh();
      } else setErr(data.error ?? "Couldn't generate.");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-accent" />
        <h2 className="text-lg font-semibold text-ink">Answers for paper questions</h2>
      </div>
      <p className="text-sm text-ink-2 mb-4">
        Paper questions have no answer, and some refer to a diagram the student
        can&apos;t see. Generate a model answer + mark scheme, and a
        black-and-white diagram for questions that need one.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => run("answers")} disabled={busy !== null}>
          {busy === "answers" ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <KeyRound size={15} /> Generate answers
            </>
          )}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run("diagrams")} disabled={busy !== null}>
          {busy === "diagrams" ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Drawing…
            </>
          ) : (
            <>
              <ImagePlus size={15} /> Generate diagrams
            </>
          )}
        </Button>
      </div>
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
      <p className="text-xs text-ink-3 mt-2">
        Diagrams are a best-effort reconstruction of what the question describes —
        not the exact original figure.
      </p>
    </Card>
  );
}
