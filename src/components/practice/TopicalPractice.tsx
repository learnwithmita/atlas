"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookText, Loader2, RefreshCw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  GeneratedPracticeSession,
  type GenQuestion,
} from "@/components/practice/GeneratedPracticeSession";

export function TopicalPractice({
  topicId,
  topicName,
  count = 6,
}: {
  topicId: string;
  topicName: string;
  count?: number;
}) {
  const [questions, setQuestions] = useState<GenQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQuestions(null);
    try {
      const res = await fetch("/api/paper/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: [topicId], count }),
      });
      const data = await res.json();
      if (res.ok) setQuestions(data.questions);
      else setError(data.error ?? "Couldn't generate questions.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [topicId, count]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href="/practice"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> Practice
      </Link>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{topicName}</h1>
          <p className="text-ink-2 mt-1">Fresh questions on this topic, marked by Atlas.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LinkButton href={`/learn/notes/${topicId}`} variant="secondary" size="sm">
            <BookText size={15} /> Notes
          </LinkButton>
          {questions && (
            <Button variant="secondary" size="sm" onClick={generate}>
              <RefreshCw size={15} /> New set
            </Button>
          )}
        </div>
      </header>

      {loading && (
        <div className="text-center py-20">
          <Loader2 size={28} className="text-accent animate-spin mx-auto mb-3" />
          <p className="text-ink-2">Writing {count} fresh questions…</p>
        </div>
      )}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-danger mb-4">{error}</p>
          <Button onClick={generate}>Try again</Button>
        </div>
      )}
      {questions && !loading && (
        <GeneratedPracticeSession questions={questions} onRegenerate={generate} />
      )}
    </div>
  );
}
