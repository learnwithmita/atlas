"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImageUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Admin helper to attach a diagram to a flashcard / question / note WITHOUT
 * relying on the (quota-limited) built-in image model: copy a ready-made visual
 * prompt, generate the image in Google Flow (or anywhere), then upload it here.
 */
export function ImagePromptUpload({
  kind,
  id,
  prompt,
  hasImage,
  onClose,
}: {
  kind: "flashcard" | "extracted" | "note";
  id: string;
  prompt: string;
  hasImage?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function copy() {
    navigator.clipboard?.writeText(prompt).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setErr("Couldn't copy — select the text and copy manually.")
    );
  }

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("id", id);
      const res = await fetch("/api/images/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
        onClose?.();
      } else setErr(data.error ?? "Upload failed.");
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-hairline bg-surface-2 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">
          {hasImage ? "Replace diagram" : "Add a diagram"}
        </p>
        {onClose && (
          <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-3 mb-1.5">
          1. Copy this prompt into Google Flow (or any image tool):
        </p>
        <textarea
          readOnly
          value={prompt}
          rows={3}
          className="w-full rounded-[10px] bg-surface border border-hairline px-3 py-2 text-sm text-ink-2 resize-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button size="sm" variant="secondary" className="mt-2" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>

      <div>
        <p className="text-xs text-ink-3 mb-1.5">2. Upload the image you generated:</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
          {busy ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

/** Build a good, quota-free visual prompt from an item's text. */
export function diagramPrompt(subject: string, title: string, detail?: string): string {
  const subj = subject || "science";
  const extra = detail ? ` It should show: ${detail}.` : "";
  return `A clean, black-and-white, clearly labelled ${subj} textbook diagram of "${title}".${extra} Thin black lines on a white background, minimal shading, no colour, clearly labelled parts, suitable for printing in black and white.`;
}
