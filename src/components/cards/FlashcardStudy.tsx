"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCw } from "lucide-react";
import type { StudyCard } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { MathText } from "@/components/ui/MathText";
import { reviewFlashcard } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const GRADES = [
  { g: "again", label: "Again", cls: "bg-danger text-white" },
  { g: "hard", label: "Hard", cls: "bg-flame text-white" },
  { g: "good", label: "Good", cls: "bg-accent text-white" },
  { g: "easy", label: "Easy", cls: "bg-mint text-white" },
] as const;

export function FlashcardStudy({
  subtopicName,
  cards,
}: {
  subtopicName: string;
  cards: StudyCard[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const card = cards[idx];

  async function grade(g: "again" | "hard" | "good" | "easy") {
    if (busy || !card) return;
    setBusy(true);
    await reviewFlashcard(card.id, g);
    setBusy(false);
    setFlipped(false);
    setIdx((i) => i + 1);
  }

  if (!card) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="h-14 w-14 mx-auto rounded-[18px] bg-mint/15 grid place-items-center mb-5">
          <Check className="text-mint" size={26} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">Deck complete</h2>
        <p className="text-ink-2 mb-6">
          Nicely done. Cards will resurface just before you&apos;d forget them.
        </p>
        <Button
          onClick={() => {
            router.push("/cards");
            router.refresh();
          }}
        >
          Back to decks
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-3">{subtopicName}</p>
        <p className="text-sm text-ink-3 tabular-nums">
          {idx + 1} / {cards.length}
        </p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-2 mb-8 overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${(idx / cards.length) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[16rem] rounded-[24px] border border-hairline bg-surface shadow-sm p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-accent/40"
      >
        {card.isNew && (
          <span className="text-xs font-medium text-accent mb-3">New card</span>
        )}
        <div className="text-xl text-ink leading-relaxed">
          <MathText>{flipped ? card.back : card.front}</MathText>
        </div>
        {!flipped && (
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-3">
            <RotateCw size={14} /> Tap to reveal
          </span>
        )}
      </button>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2 mt-6">
          {GRADES.map((g) => (
            <button
              key={g.g}
              disabled={busy}
              onClick={() => grade(g.g)}
              className={cn(
                "h-12 rounded-[14px] text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform",
                g.cls
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      ) : (
        <Button className="w-full mt-6" size="lg" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}
    </div>
  );
}
