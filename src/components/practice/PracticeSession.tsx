"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  X,
} from "lucide-react";
import type { PracticeQuestion } from "@/lib/data";
import type { MarkResult } from "@/lib/gemini";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/ui/MathText";
import { cn } from "@/lib/utils";

const errorTone: Record<string, string> = {
  conceptual: "danger",
  knowledge: "danger",
  technique: "flame",
  careless: "flame",
  none: "mint",
};

export function PracticeSession({
  questions,
}: {
  questions: PracticeQuestion[];
}) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];

  if (!q) {
    return (
      <div className="mx-auto max-w-md text-center py-24 px-6">
        <div className="h-14 w-14 mx-auto rounded-[18px] bg-mint/15 grid place-items-center mb-5">
          <Check className="text-mint" size={26} />
        </div>
        <h2 className="text-2xl font-semibold text-ink mb-2">Set complete</h2>
        <p className="text-ink-2">
          Your mastery map just updated. Head back to see what moved.
        </p>
        <Button className="mt-6" onClick={() => (window.location.href = "/learn")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-8">
        {questions.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < idx
                ? "bg-accent"
                : i === idx
                ? "bg-accent/50"
                : "bg-surface-2"
            )}
          />
        ))}
      </div>

      <QuestionCard
        key={q.id}
        q={q}
        onNext={() => setIdx((i) => i + 1)}
        last={idx === questions.length - 1}
      />
    </div>
  );
}

function QuestionCard({
  q,
  onNext,
  last,
}: {
  q: PracticeQuestion;
  onNext: () => void;
  last: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<MarkResult | null>(null);
  const [showModel, setShowModel] = useState(false);
  const startedAt = useState(() => Date.now())[0];

  const isMcq = q.type === "mcq";

  async function submitOpen() {
    if (!answer.trim() || marking) return;
    setMarking(true);
    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          answer,
          timeTaken: Math.round((Date.now() - startedAt) / 1000),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setSubmitted(true);
      } else {
        setResult({
          awarded: 0,
          max: q.marks,
          missingPoints: [],
          awardedPoints: [],
          errorType: "none",
          modelAnswer: "",
          improvedAnswer: "",
          feedback: data.error ?? "Marking failed.",
        });
        setSubmitted(true);
      }
    } finally {
      setMarking(false);
    }
  }

  const correctOpt = q.options.find((o) => o.isCorrect);
  const chosen = q.options.find((o) => o.label === selected);

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex flex-wrap gap-2">
          {q.commandWords.map((c) => (
            <Badge key={c} tone="accent" className="capitalize">
              {c}
            </Badge>
          ))}
          {q.subtopic && <Badge>{q.subtopic}</Badge>}
        </div>
        <span className="shrink-0 text-sm font-medium text-ink-2 tabular-nums">
          [{q.marks} {q.marks === 1 ? "mark" : "marks"}]
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-ink leading-snug mb-6">
        <MathText>{q.stem}</MathText>
      </h1>

      {/* MCQ */}
      {isMcq ? (
        <div className="space-y-2.5">
          {q.options.map((o) => {
            const isChosen = selected === o.label;
            const reveal = submitted;
            const good = reveal && o.isCorrect;
            const bad = reveal && isChosen && !o.isCorrect;
            return (
              <button
                key={o.label}
                disabled={submitted}
                onClick={() => setSelected(o.label)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-[14px] border text-left transition-all",
                  good && "border-mint bg-mint/10",
                  bad && "border-danger bg-danger/10",
                  !reveal && isChosen && "border-accent bg-accent-soft",
                  !reveal && !isChosen && "border-hairline hover:border-accent/50"
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 shrink-0 grid place-items-center rounded-full text-sm font-semibold",
                    good
                      ? "bg-mint text-white"
                      : bad
                      ? "bg-danger text-white"
                      : isChosen
                      ? "bg-accent text-white"
                      : "bg-surface-2 text-ink-2"
                  )}
                >
                  {good ? <Check size={15} /> : bad ? <X size={15} /> : o.label}
                </span>
                <span className="text-ink">{o.text}</span>
              </button>
            );
          })}

          {submitted && chosen && !chosen.isCorrect && chosen.rationale && (
            <p className="text-sm text-ink-2 pt-2 pl-1">
              <span className="text-danger font-medium">Why not: </span>
              {chosen.rationale}
            </p>
          )}
          {submitted && correctOpt && (
            <p className="text-sm text-mint pt-1 pl-1 font-medium">
              Correct answer: {correctOpt.label}. {correctOpt.text}
            </p>
          )}

          {!submitted ? (
            <Button
              className="mt-4"
              disabled={!selected}
              onClick={() => setSubmitted(true)}
            >
              Check answer
            </Button>
          ) : (
            <Button className="mt-4" variant="secondary" onClick={onNext}>
              {last ? "Finish" : "Next question"} <ArrowRight size={16} />
            </Button>
          )}
        </div>
      ) : (
        /* Open-ended */
        <div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
            rows={5}
            placeholder="Write your answer as you would in the exam…"
            className="w-full rounded-[16px] border border-hairline bg-surface p-4 text-[15px] text-ink outline-none focus:border-accent transition-colors resize-none disabled:opacity-70"
          />

          {!submitted ? (
            <Button
              className="mt-4"
              disabled={!answer.trim() || marking}
              onClick={submitOpen}
            >
              {marking ? "Marking…" : "Mark my answer"}
            </Button>
          ) : (
            result && <MarkingPanel
              result={result}
              showModel={showModel}
              setShowModel={setShowModel}
              onNext={onNext}
              last={last}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MarkingPanel({
  result,
  showModel,
  setShowModel,
  onNext,
  last,
}: {
  result: MarkResult;
  showModel: boolean;
  setShowModel: (v: boolean) => void;
  onNext: () => void;
  last: boolean;
}) {
  const pct = result.max ? (result.awarded / result.max) * 100 : 0;
  return (
    <div className="mt-5 rounded-[18px] border border-hairline bg-surface-2/50 p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-ink tabular-nums">
            {result.awarded}
          </span>
          <span className="text-ink-3 text-lg">/ {result.max}</span>
        </div>
        {result.errorType !== "none" && (
          <Badge tone={(errorTone[result.errorType] ?? "neutral") as never}>
            <span className="capitalize">{result.errorType} slip</span>
          </Badge>
        )}
        {pct === 100 && <Badge tone="mint">Full marks</Badge>}
      </div>

      {result.awardedPoints.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {result.awardedPoints.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink">
              <Check size={16} className="text-mint shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      )}
      {result.missingPoints.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {result.missingPoints.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-2">
              <X size={16} className="text-danger shrink-0 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      )}

      {result.feedback && (
        <p className="text-sm text-ink-2 leading-relaxed border-t border-hairline pt-3">
          {result.feedback}
        </p>
      )}

      {(result.modelAnswer || result.improvedAnswer) && (
        <button
          onClick={() => setShowModel(!showModel)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent"
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform", showModel && "rotate-180")}
          />
          {showModel ? "Hide" : "Show"} model answer
        </button>
      )}
      {showModel && (
        <div className="mt-3 space-y-3">
          {result.improvedAnswer && (
            <div className="rounded-[14px] bg-accent-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1.5 flex items-center gap-1.5">
                <Sparkles size={12} /> Your answer, improved
              </p>
              <p className="text-sm text-ink leading-relaxed">
                <MathText>{result.improvedAnswer}</MathText>
              </p>
            </div>
          )}
          {result.modelAnswer && (
            <div className="rounded-[14px] border border-hairline p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-1.5">
                Model answer
              </p>
              <p className="text-sm text-ink-2 leading-relaxed">
                <MathText>{result.modelAnswer}</MathText>
              </p>
            </div>
          )}
        </div>
      )}

      <Button className="mt-5" variant="secondary" onClick={onNext}>
        {last ? "Finish" : "Next question"} <ArrowRight size={16} />
      </Button>
    </div>
  );
}
