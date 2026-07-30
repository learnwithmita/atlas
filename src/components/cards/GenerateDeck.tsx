"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import type { CurriculumSubject } from "@/lib/data";
import { Button } from "@/components/ui/Button";

export function GenerateDeck({
  subjects,
  endpoint = "/api/flashcards/generate",
  label = "Generate a deck",
}: {
  subjects: CurriculumSubject[];
  endpoint?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subtopicId, setSubtopicId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generate() {
    if (!subtopicId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtopicId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Added ${data.count} cards.`);
        router.refresh();
      } else setMsg(data.error ?? "Failed to generate.");
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Sparkles size={16} /> {label}
      </Button>
    );
  }

  return (
    <div className="rounded-[18px] border border-hairline bg-surface p-5 shadow-sm w-full max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Sparkles size={16} className="text-accent" /> AI flashcards
        </h3>
        <button onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink">
          <X size={18} />
        </button>
      </div>
      <select
        value={subtopicId}
        onChange={(e) => setSubtopicId(e.target.value)}
        className="w-full h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink mb-3"
      >
        <option value="">Choose a subtopic…</option>
        {subjects.map((s) => (
          <optgroup key={s.id} label={s.name}>
            {s.topics.flatMap((t) =>
              t.subtopics.map((st) => (
                <option key={st.id} value={st.id}>
                  {t.name} — {st.name}
                </option>
              ))
            )}
          </optgroup>
        ))}
      </select>
      <Button className="w-full" onClick={generate} disabled={!subtopicId || busy}>
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Generating…
          </>
        ) : (
          "Generate 8 cards"
        )}
      </Button>
      {msg && <p className="text-sm text-ink-2 mt-2">{msg}</p>}
    </div>
  );
}
