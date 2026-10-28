import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { getEntitlement } from "@/lib/entitlements";
import {
  hasSummary,
  hasSummaryPdf,
  summaryImageUrl,
  summaryPdfUrl,
} from "@/lib/summaries";

export const metadata = { title: "Summary sheet · Atlas" };
export const dynamic = "force-dynamic";

/** Pro-gated full-page view of a topic's one-page summary sheet. */
export default async function SummaryPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const [t, ent] = await Promise.all([getTopicStudio(topicId), getEntitlement()]);
  if (!t.topicName) notFound();
  if (!ent.isPro) redirect("/pricing");

  const src = hasSummary(topicId) ? summaryImageUrl(topicId) : null;
  // In-app we show a single image; the download is a multi-page A4 PDF when the
  // sheet is tall enough to warrant one, so it prints at a readable size.
  const pdf = hasSummaryPdf(topicId);
  const downloadHref = pdf ? summaryPdfUrl(topicId) : src;
  const downloadName = `${t.topicName} summary.${pdf ? "pdf" : "png"}`;

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link
          href={`/learn/topic/${topicId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={16} /> {t.topicName}
        </Link>
        {downloadHref && (
          <a
            href={downloadHref}
            download={downloadName}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent"
          >
            <Download size={14} /> Download{pdf ? " PDF" : ""}
          </a>
        )}
      </div>

      {src ? (
        <figure className="rounded-[16px] overflow-hidden border border-hairline bg-white">
          {/* Served per-student (watermarked) by the image route. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${t.topicName} summary sheet`}
            className="w-full h-auto block"
          />
        </figure>
      ) : (
        <div className="rounded-[16px] border border-hairline bg-surface p-10 text-center text-ink-2">
          The summary sheet for this topic is being prepared.
        </div>
      )}
    </div>
  );
}
