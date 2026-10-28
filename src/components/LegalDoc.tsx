import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Shared layout for the public legal pages (privacy, terms, refund). Content is
 * authored by us (static markdown), so rendering it as HTML is safe. Styling
 * reuses the `.notes-prose` container.
 */
export default function LegalDoc({
  title,
  updated,
  markdown,
}: {
  title: string;
  updated: string;
  markdown: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-8"
      >
        <ArrowLeft size={16} /> Atlas
      </Link>
      <h1 className="text-3xl font-bold text-ink mb-1.5">{title}</h1>
      <p className="text-sm text-ink-3 mb-8">Last updated: {updated}</p>
      <div
        className="notes-prose text-ink"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
      />
    </div>
  );
}
