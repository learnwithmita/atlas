"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TYPES = [
  { v: "syllabus", label: "Syllabus" },
  { v: "past_paper", label: "Past paper" },
  { v: "mark_scheme", label: "Mark scheme" },
  { v: "notes", label: "Notes" },
  { v: "worksheet", label: "Worksheet" },
  { v: "other", label: "Other" },
];

export function UploadResource({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("past_paper");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function upload() {
    if (!file || !title.trim()) {
      setMsg({ text: "Add a file and a title first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg({ text: "Please sign in again." });
        return;
      }
      const path = `${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("resources").upload(path, file);
      if (up.error) {
        setMsg({ text: `Upload failed: ${up.error.message}` });
        return;
      }
      const ins = await supabase.from("resources").insert({
        uploaded_by: user.id,
        type,
        title: title.trim(),
        subject_id: subjectId || null,
        file_path: path,
        file_size: file.size,
        status: "uploaded",
      });
      if (ins.error) {
        setMsg({ text: `Saved file but metadata failed: ${ins.error.message}` });
        return;
      }
      setMsg({ ok: true, text: "Uploaded. Queued for review." });
      setFile(null);
      setTitle("");
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Upload error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-[16px] border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          drag ? "border-accent bg-accent-soft" : "border-hairline hover:border-accent/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.pptx"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <UploadCloud className="mx-auto text-ink-3 mb-3" size={30} />
        {file ? (
          <p className="text-ink font-medium flex items-center justify-center gap-2">
            <FileUp size={16} /> {file.name}
          </p>
        ) : (
          <>
            <p className="text-ink font-medium">Drop a file or click to browse</p>
            <p className="text-sm text-ink-3 mt-1">
              Syllabus PDF, past paper, mark scheme · PDF / image / docx
            </p>
          </>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. 2024 Prelim P2)"
          className="h-11 px-4 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink sm:col-span-3"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink"
        >
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-11 px-3 rounded-[12px] bg-surface-2 border border-hairline outline-none focus:border-accent text-[15px] text-ink"
        >
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button onClick={upload} disabled={busy} className="h-11">
          {busy ? <Loader2 size={16} className="animate-spin" /> : "Upload"}
        </Button>
      </div>

      {msg && (
        <p className={cn("text-sm", msg.ok ? "text-mint" : "text-danger")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
