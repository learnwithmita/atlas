"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Admin control: generate model answers + mark schemes for a topic's extracted
 * paper questions (they have none by default), so they show "Show answer".
 */
export function GenerateAnswers({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/extract/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          data.added > 0
            ? `Generated answers for ${data.added} paper questions.`
            : data.message ?? "Nothing to answer."
        );
        router.refresh();
      } else setErr(data.error ?? "Couldn't generate answers.");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-accent" />
        <h2 className="text-lg font-semibold text-ink">Answers for paper questions</h2>
      </div>
      <p className="text-sm text-ink-2 mb-4">
        Extracted paper questions have no answer. Generate a model answer + mark
        scheme for each so students (and your answer-key printout) can see them.
      </p>
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Generating…
          </>
        ) : (
          <>
            <KeyRound size={15} /> Generate answers
          </>
        )}
      </Button>
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </Card>
  );
}
