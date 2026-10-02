"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Layers, RotateCw, Zap } from "lucide-react";
import type { StudyCard } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { MathText } from "@/components/ui/MathText";
import { recordActivity, reviewFlashcard } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const GRADES = [
  { g: "again", label: "Again", cls: "bg-danger text-white" },
  { g: "good", label: "Unsure", cls: "bg-flame text-white" },
  { g: "easy", label: "Confident", cls: "bg-mint text-white" },
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
  const [xp, setXp] = useState(0); // running XP earned this session
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const card = cards[idx];

  async function grade(g: "again" | "hard" | "good" | "easy") {
    if (busy || !card) return;
    setBusy(true);
    await reviewFlashcard(card.id, g);
    // Reward engagement, a little more for confident recall.
    const gained = g === "easy" ? 3 : g === "good" ? 2 : 1;
    const total = xp + gained;
    setXp(total);
    const last = idx + 1 >= cards.length;
    if (last) {
      const r = await recordActivity(total, 3);
      if (!r?.skipped) setEarnedXp(total);
    }
    setBusy(false);
    setFlipped(false);
    setIdx((i) => i + 1);
  }

  // An empty deck is not a finished deck — don't show the celebration state.
  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="h-14 w-14 mx-auto rounded-[18px] bg-surface-2 grid place-items-center mb-5">
          <Layers className="text-ink-3" size={26} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">No cards yet</h2>
        <p className="text-ink-2 mb-6">
          This deck doesn&apos;t have any flashcards yet. Cards added here show
          up for every student in the class.
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

  if (!card) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="h-14 w-14 mx-auto rounded-[18px] bg-mint/15 grid place-items-center mb-5">
          <Check className="text-mint" size={26} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">Deck complete</h2>
        {earnedXp != null && earnedXp > 0 && (
          <p className="inline-flex items-center gap-1.5 text-flame font-semibold mb-2">
            <Zap size={16} className="fill-flame" /> +{earnedXp} XP
          </p>
        )}
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
        {flipped && card.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt=""
            className="mt-5 max-h-48 w-auto rounded-[12px] border border-hairline bg-white"
          />
        )}
        {!flipped && (
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-3">
            <RotateCw size={14} /> Tap to reveal
          </span>
        )}
      </button>

      {flipped ? (
        <div className="grid grid-cols-3 gap-2 mt-6">
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
