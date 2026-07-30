"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Globe,
  ListChecks,
  Loader2,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
import type { ResourceRow } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const vis = {
  public: { icon: Globe, label: "Platform", tone: "mint" as const },
  shared: { icon: Users, label: "Shared", tone: "accent" as const },
  private: { icon: Lock, label: "Only me", tone: "neutral" as const },
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function ResourceCard({
  resource: r,
  detailBase,
}: {
  resource: ResourceRow;
  detailBase: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const v = vis[r.visibility as keyof typeof vis] ?? vis.private;
  const VIcon = v.icon;
  const extracted = r.extractedCount > 0;

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: r.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Extraction failed.");
      else router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <span className="h-10 w-10 shrink-0 rounded-[12px] bg-surface-2 grid place-items-center">
          <FileText size={18} className="text-ink-2" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink truncate">
            {r.title}
            {r.mine && <span className="text-ink-3 font-normal"> · yours</span>}
          </p>
          <p className="text-xs text-ink-3">
            {r.type.replace("_", " ")}
            {r.subject ? ` · ${r.subject}` : ""} · {fmtSize(r.file_size)}
          </p>
        </div>
        <Badge tone={v.tone}>
          <VIcon size={12} /> {v.label}
        </Badge>
      </div>

      <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between gap-3">
        {extracted ? (
          <>
            <span className="text-sm text-ink-2 flex items-center gap-1.5">
              <ListChecks size={15} className="text-mint" />
              {r.extractedCount} questions extracted
            </span>
            <Link
              href={`${detailBase}/${r.id}`}
              className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
            >
              View paper <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <span className="text-sm text-ink-3">
              {error ?? "Detect questions & topics with AI"}
            </span>
            <Button size="sm" onClick={extract} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Extracting…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Extract questions
                </>
              )}
            </Button>
          </>
        )}
      </div>
      {error && extracted && <p className="text-sm text-danger mt-2">{error}</p>}
    </Card>
  );
}
