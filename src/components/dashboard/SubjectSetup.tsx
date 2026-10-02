"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setStudySubjects } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

const CHOICES = [
  { token: "combined", label: "Combined Science (Bio/Chem)", blurb: "Biology + Chemistry in one subject" },
  { token: "biology", label: "Pure Biology", blurb: "Full Biology syllabus" },
  { token: "chemistry", label: "Pure Chemistry", blurb: "Full Chemistry syllabus" },
];
const LEVELS = [
  { v: "G3", label: "Sec 3–4 (G3)" },
  { v: "G2", label: "Sec 3–4 (G2)" },
  { v: "G1", label: "Sec 3–4 (G1)" },
  { v: "O", label: "O-Level" },
];

export function SubjectSetup({
  initial = [],
  initialLevel = "G3",
  compact = false,
}: {
  initial?: string[];
  initialLevel?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(initial);
  const [level, setLevel] = useState(initialLevel);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (t: string) =>
    setPicked((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await setStudySubjects(picked, level);
      if (r.error) setError(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className={cn(!compact && "mx-auto max-w-lg")}>
      {!compact && (
        <>
          <h1 className="text-2xl font-semibold text-ink mb-1">
            What are you studying?
          </h1>
          <p className="text-ink-2 mb-6">
            So Atlas only shows your syllabus. You can change this later in your
            account.
          </p>
        </>
      )}

      <div className="space-y-2.5">
        {CHOICES.map((o) => {
          const on = picked.includes(o.token);
          return (
            <button
              key={o.token}
              type="button"
              onClick={() => toggle(o.token)}
              aria-pressed={on}
              className={cn(
                "w-full p-4 rounded-[14px] border text-left transition-all flex items-center justify-between gap-3",
                on
                  ? "bg-accent-soft border-accent"
                  : "bg-surface-2 border-hairline hover:border-accent/40"
              )}
            >
              <div>
                <p className={cn("font-medium", on ? "text-accent" : "text-ink")}>
                  {o.label}
                </p>
                <p className="text-sm text-ink-3">{o.blurb}</p>
              </div>
              <span
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full grid place-items-center border",
                  on ? "bg-accent border-accent text-white" : "border-hairline"
                )}
              >
                {on && <Check size={14} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-ink-3 mb-2 px-1">Level</p>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-full h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline text-[15px] text-ink outline-none focus:border-accent"
        >
          {LEVELS.map((l) => (
            <option key={l.v} value={l.v}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-danger mt-3">{error}</p>}

      <Button
        className="w-full mt-5"
        size="lg"
        onClick={save}
        disabled={pending || picked.length === 0}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving…
          </>
        ) : saved && compact ? (
          "Saved"
        ) : compact ? (
          "Save subjects"
        ) : (
          "Start learning"
        )}
      </Button>
    </div>
  );
}
