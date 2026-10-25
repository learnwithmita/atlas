import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTopicStudio } from "@/lib/data";
import { getEntitlement } from "@/lib/entitlements";
import { hasSummary, summaryImageUrl } from "@/lib/summaries";

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

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-8 pb-24 md:pb-8">
      <Link
        href={`/learn/topic/${topicId}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
      >
        <ArrowLeft size={16} /> {t.topicName}
      </Link>

      {src ? (
        <figure className="rounded-[16px] overflow-hidden border border-hairline bg-white">
          {/* Static asset from /public/summaries; plain img keeps it simple. */}
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
