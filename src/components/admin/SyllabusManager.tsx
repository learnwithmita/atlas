"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SyllabusRow } from "@/lib/data";
import { cn } from "@/lib/utils";

type Ingested = {
  subject: { name: string; level: string; track: string; code: string | null };
  counts: { topics: number; subtopics: number; outcomes: number };
  tree: {
    topics: { name: string; subtopics: { name: string; outcomes: unknown[] }[] }[];
  };
};

export function SyllabusManager({ syllabuses }: { syllabuses: SyllabusRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Ingested | null>(null);

  async function ingest() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/syllabus/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setResult(data as Ingested);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh(); // pull the updated overview list
      } else {
        setError(data.error ?? "Ingest failed.");
      }
    } catch {
      setError("Network error while uploading the syllabus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Uploader */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-ink">Upload a syllabus</h2>
        </div>
        <p className="text-ink-2 text-sm mb-5">
          Drop in an official SEAB syllabus PDF. Atlas reads it and builds the
          topic → subtopic → learning-outcome tree automatically — no manual
          seeding. Re-uploading the same subject refreshes it.
        </p>

        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
            file
              ? "border-accent bg-accent-soft"
              : "border-hairline hover:border-accent/50 hover:bg-surface-2"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
          />
          {file ? (
            <>
              <FileText size={26} className="text-accent" />
              <span className="text-sm font-medium text-ink">{file.name}</span>
              <span className="text-xs text-ink-3">
                {(file.size / 1024 / 1024).toFixed(1)} MB · click to change
              </span>
            </>
          ) : (
            <>
              <UploadCloud size={26} className="text-ink-3" />
              <span className="text-sm font-medium text-ink">
                Choose a syllabus PDF
              </span>
              <span className="text-xs text-ink-3">PDF, PNG or JPG</span>
            </>
          )}
        </label>

        {error && <p className="text-sm text-danger mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-5">
          <Button onClick={ingest} disabled={!file || busy}>
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Reading the
                syllabus…
              </>
            ) : (
              <>
                <Sparkles size={18} /> Extract &amp; seed
              </>
            )}
          </Button>
          {busy && (
            <span className="text-sm text-ink-3">
              This can take 20–40 seconds for a full syllabus.
            </span>
          )}
        </div>
      </Card>

      {/* Freshly ingested preview */}
      {result && (
        <Card className="p-6 border-accent/40">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-ink">
              {result.subject.name} ({result.subject.level}
              {result.subject.track ? `, ${result.subject.track}` : ""}) seeded
            </h2>
          </div>
          <p className="text-ink-2 text-sm mb-4">
            {result.counts.topics} topics · {result.counts.subtopics} subtopics ·{" "}
            {result.counts.outcomes} learning outcomes
            {result.subject.code ? ` · ${result.subject.code}` : ""}
          </p>
          <div className="space-y-2">
            {result.tree.topics.map((t, i) => (
              <TreeTopic
                key={`${t.name}-${i}`}
                name={t.name}
                subtopics={t.subtopics}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Overview of what's loaded */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-3">
          Syllabuses loaded
        </h2>
        {syllabuses.length === 0 ? (
          <Card className="p-8 text-center text-ink-2">
            No syllabuses ingested yet. Upload one above to build its curriculum.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {syllabuses.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{s.subjectName}</p>
                    <p className="text-xs text-ink-3 mt-0.5">
                      {[s.examBody, s.level, s.track, s.code]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge tone={s.track === "Combined" ? "mint" : "neutral"}>
                    {s.track ?? "—"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-ink-2">
                  <span>
                    <strong className="text-ink tabular-nums">
                      {s.topicCount}
                    </strong>{" "}
                    topics
                  </span>
                  <span>
                    <strong className="text-ink tabular-nums">
                      {s.subtopicCount}
                    </strong>{" "}
                    subtopics
                  </span>
                  <span>
                    <strong className="text-ink tabular-nums">
                      {s.outcomeCount}
                    </strong>{" "}
                    outcomes
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeTopic({
  name,
  subtopics,
}: {
  name: string;
  subtopics: { name: string; outcomes: unknown[] }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[12px] border border-hairline overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2"
      >
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-ink-3">{subtopics.length} subtopics</span>
          <ChevronDown
            size={16}
            className={cn("text-ink-3 transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open && (
        <ul className="border-t border-hairline divide-y divide-[color:var(--color-hairline)]">
          {subtopics.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-sm text-ink-2">{s.name}</span>
              <span className="text-xs text-ink-3 shrink-0">
                {s.outcomes.length} outcomes
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
