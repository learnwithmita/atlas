"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import type { ClozeItem } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { MathText } from "@/components/ui/MathText";
import { recordActivity } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "");

function parse(text: string) {
  const open = text.indexOf("{{");
  const close = text.indexOf("}}");
  if (open === -1 || close === -1)
    return { before: text, answer: "", after: "" };
  return {
    before: text.slice(0, open),
    answer: text.slice(open + 2, close),
    after: text.slice(close + 2),
  };
}

export function ClozeStudy({
  subtopicName,
  items,
}: {
  subtopicName: string;
  items: ClozeItem[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = items[idx];
  const parts = useMemo(() => (item ? parse(item.text) : null), [item]);
  const correct = checked && parts ? norm(value) === norm(parts.answer) : false;

  function check() {
    if (!value.trim() || checked) return;
    setChecked(true);
    if (parts && norm(value) === norm(parts.answer)) setScore((s) => s + 1);
  }

  async function next() {
    if (idx + 1 >= items.length) {
      await recordActivity(10 + score, 3);
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setValue("");
    setChecked(false);
  }

  if (done || !item || !parts) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="h-14 w-14 mx-auto rounded-[18px] bg-mint/15 grid place-items-center mb-5">
          <Check className="text-mint" size={26} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-1">
          {items.length === 0 ? "No items yet" : "Nice work"}
        </h2>
        <p className="text-ink-2 mb-6">
          {items.length === 0
            ? "Generate a set with AI to start."
            : `You got ${score}/${items.length} right.`}
        </p>
        <Button
          onClick={() => {
            router.push("/blanks");
            router.refresh();
          }}
        >
          Back to sets
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-3">{subtopicName}</p>
        <p className="text-sm text-ink-3 tabular-nums">
          {idx + 1} / {items.length}
        </p>
      </div>

      <div className="rounded-[24px] border border-hairline bg-surface shadow-sm p-8">
        <p className="text-xl text-ink leading-loose">
          <MathText>{parts.before}</MathText>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (checked ? next() : check())}
            disabled={checked}
            autoFocus
            placeholder="?"
            className={cn(
              "inline-block mx-1 px-2 min-w-32 text-center border-b-2 bg-transparent outline-none",
              !checked && "border-accent text-ink",
              checked && correct && "border-mint text-mint",
              checked && !correct && "border-danger text-danger"
            )}
            style={{ width: `${Math.max(8, value.length + 2)}ch` }}
          />
          <MathText>{parts.after}</MathText>
        </p>

        {checked && (
          <div
            className={cn(
              "mt-5 flex items-start gap-2 text-sm",
              correct ? "text-mint" : "text-ink-2"
            )}
          >
            {correct ? (
              <Check size={17} className="shrink-0 mt-0.5" />
            ) : (
              <X size={17} className="text-danger shrink-0 mt-0.5" />
            )}
            <span>
              {correct ? "Correct!" : "Answer: "}
              {!correct && <strong className="text-ink">{parts.answer}</strong>}
            </span>
          </div>
        )}
      </div>

      {!checked ? (
        <Button className="w-full mt-6" size="lg" disabled={!value.trim()} onClick={check}>
          Check
        </Button>
      ) : (
        <Button className="w-full mt-6" size="lg" onClick={next}>
          {idx + 1 >= items.length ? "Finish" : "Next"} <ArrowRight size={16} />
        </Button>
      )}
    </div>
  );
}
