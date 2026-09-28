"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Admin/tutor control to pre-generate reusable bank questions for a topic.
 * Filling the bank once means students share these questions instead of each
 * triggering fresh AI calls.
 */
export function BankBuilder({ topicId, count }: { topicId: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(20);
  // Track the count locally so it updates instantly after building, regardless
  // of when the server component re-renders.
  const [liveCount, setLiveCount] = useState(count);

  async function build() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/bank/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, count: n }),
      });
      const data = await res.json();
      if (res.ok) {
        setLiveCount((c) => c + (data.added ?? 0));
        setMsg(
          data.added > 0
            ? `Added ${data.added} questions to the bank.`
            : "No questions were added — Gemini may be busy. Try again in a moment."
        );
        router.refresh();
      } else setErr(data.error ?? "Couldn't build the bank.");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 mb-6 border-accent/30">
      <div className="flex items-center gap-2 mb-1">
        <Database size={18} className="text-accent" />
        <h2 className="text-lg font-semibold text-ink">Reusable question bank</h2>
      </div>
      <p className="text-sm text-ink-2 mb-4">
        <strong className="text-ink tabular-nums">{liveCount}</strong> AI
        questions stored for this topic (each with its own mark scheme). Students
        draw from
        these instead of generating fresh ones — so they&apos;re written once and
        reused, not re-billed per student.
      </p>
      <div className="flex items-center gap-3">
        <label className="text-sm text-ink-2">
          Generate
          <select
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="mx-2 rounded-lg bg-surface-2 border border-hairline px-2 py-1.5 text-sm text-ink"
          >
            {[10, 20, 30].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          more
        </label>
        <Button onClick={build} disabled={busy} size="sm">
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Building…
            </>
          ) : (
            <>
              <Sparkles size={15} /> Build bank
            </>
          )}
        </Button>
      </div>
      {busy && (
        <p className="text-xs text-ink-3 mt-2">
          Uses your Gemini key once — about 20–40 seconds.
        </p>
      )}
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      {msg && <p className="text-sm text-accent mt-2">{msg}</p>}
    </Card>
  );
}
