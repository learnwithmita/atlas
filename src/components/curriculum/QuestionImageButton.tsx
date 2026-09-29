"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { ImagePromptUpload, diagramPrompt } from "@/components/admin/ImagePromptUpload";

/** Admin control on a paper question to attach a diagram via prompt + upload. */
export function QuestionImageButton({
  id,
  stem,
  subject,
  hasImage,
}: {
  id: string;
  stem: string;
  subject: string;
  hasImage: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent"
      >
        <ImagePlus size={14} /> {hasImage ? "Change diagram" : "Add diagram"}
      </button>
      {open && (
        <div className="mt-2">
          <ImagePromptUpload
            kind="extracted"
            id={id}
            hasImage={hasImage}
            prompt={diagramPrompt(subject, stem.slice(0, 160))}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
