"use client";

import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { MathText } from "@/components/ui/MathText";
import { cn } from "@/lib/utils";

/** Collapsible answer / mark scheme for a bank question. */
export function AnswerReveal({ answer }: { answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent"
      >
        <Eye size={14} /> {open ? "Hide answer" : "Show answer"}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 pl-3 border-l-2 border-accent/40 text-sm text-ink-2 whitespace-pre-line">
          <MathText>{answer}</MathText>
        </div>
      )}
    </div>
  );
}
