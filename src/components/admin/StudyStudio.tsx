"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookText, ExternalLink, Layers, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Row = {
  key: "flashcards" | "notes";
  title: string;
  icon: typeof Layers;
  desc: string;
  status: string;
  endpoint: string;
  viewHref: string;
  viewLabel: string;
};

export function StudyStudio({
  topicId,
  flashcardCount,
  hasNotes,
  outcomeCount,
  firstSubtopicId,
}: {
  topicId: string;
  flashcardCount: number;
  hasNotes: boolean;
  outcomeCount: number;
  firstSubtopicId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [fc, setFc] = useState(flashcardCount);
  const [notes, setNotes] = useState(hasNotes);

  async function run(key: string, endpoint: string) {
    setBusy(key);
    setErr((e) => ({ ...e, [key]: "" }));
    setMsg((m) => ({ ...m, [key]: "" }));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (key === "flashcards") setFc((n) => n + (data.added ?? 0));
        if (key === "notes") setNotes(true);
        setMsg((m) => ({
          ...m,
          [key]: key === "flashcards" ? `Generated ${data.added} shared cards.` : "Notes generated.",
        }));
        router.refresh();
      } else setErr((e) => ({ ...e, [key]: data.error ?? "Failed." }));
    } catch {
      setErr((e) => ({ ...e, [key]: "Network error." }));
    } finally {
      setBusy(null);
    }
  }

  const rows: Row[] = [
    {
      key: "flashcards",
      title: "Flashcards",
      icon: Layers,
      desc: "Definition cards (term → function) covering every learning outcome. Shared with all students.",
      status: fc > 0 ? `${fc} shared cards` : "None yet",
      endpoint: "/api/flashcards/generate-topic",
      viewHref: firstSubtopicId ? `/cards/${firstSubtopicId}` : "/cards",
      viewLabel: "View deck",
    },
    {
      key: "notes",
      title: "Revision notes",
      icon: BookText,
      desc: "Key points + misconceptions covering every learning outcome. Editable, printable.",
      status: notes ? "Generated" : "None yet",
      endpoint: "/api/notes/generate",
      viewHref: `/learn/notes/${topicId}`,
      viewLabel: "View notes",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3">
        Covers {outcomeCount} learning outcome{outcomeCount === 1 ? "" : "s"}.
        Generated once on your Gemini key and shared with every student.
      </p>
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <Card key={r.key} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-[12px] bg-accent-soft grid place-items-center">
                  <Icon size={19} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-sm text-ink-2 mt-0.5">{r.desc}</p>
                  <p className="text-xs text-ink-3 mt-1">{r.status}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button size="sm" disabled={busy !== null} onClick={() => run(r.key, r.endpoint)}>
                {busy === r.key ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> {r.status === "None yet" ? "Generate" : "Regenerate"}
                  </>
                )}
              </Button>
              <Link
                href={r.viewHref}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent"
              >
                <ExternalLink size={14} /> {r.viewLabel}
              </Link>
            </div>
            {err[r.key] && <p className="text-sm text-danger mt-2">{err[r.key]}</p>}
            {msg[r.key] && <p className="text-sm text-accent mt-2">{msg[r.key]}</p>}
          </Card>
        );
      })}
    </div>
  );
}
