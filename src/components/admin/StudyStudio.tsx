import Link from "next/link";
import { BookText, ExternalLink, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MathText } from "@/components/ui/MathText";

type Row = {
  key: string;
  title: string;
  icon: typeof Layers;
  desc: string;
  status: string;
  viewHref?: string;
  viewLabel?: string;
};

/**
 * Review panel for a topic's notes & flashcards. These are authored by us and
 * uploaded, not generated in-app — so there is no generate/regenerate here.
 * Questions are the only generated content, and that lives on the bank page.
 */
export function StudyStudio({
  topicId,
  flashcardCount,
  hasNotes,
  outcomeCount,
  cards = [],
}: {
  topicId: string;
  flashcardCount: number;
  hasNotes: boolean;
  outcomeCount: number;
  cards?: { front: string; back: string }[];
}) {
  const rows: Row[] = [
    {
      key: "notes",
      title: "Revision notes",
      icon: BookText,
      desc: "Full revision notes covering every learning outcome. Shown to all students. Review them in Student preview.",
      status: hasNotes ? "Published" : "Not published yet",
    },
    {
      key: "flashcards",
      title: "Flashcards",
      icon: Layers,
      desc: "Definition cards (term → function) covering every learning outcome. Shared with all students.",
      status: flashcardCount > 0 ? `${flashcardCount} shared cards` : "None yet",
      viewHref: `/admin/cards/${topicId}`,
      viewLabel: "Review cards",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3">
        Covers {outcomeCount} learning outcome{outcomeCount === 1 ? "" : "s"}.
        Notes and flashcards are authored and uploaded, not generated here.
      </p>

      {rows.map((r) => {
        const Icon = r.icon;
        const ready =
          r.status !== "Not published yet" && r.status !== "None yet";
        return (
          <Card key={r.key} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-[12px] bg-accent-soft grid place-items-center">
                  <Icon size={19} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-sm text-ink-2 mt-0.5">{r.desc}</p>
                  <p className="text-xs text-ink-3 mt-1">{r.status}</p>
                </div>
              </div>
              {ready && r.viewHref && (
                <Link
                  href={r.viewHref}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-hairline text-ink-2 hover:border-accent hover:text-accent shrink-0"
                >
                  <ExternalLink size={14} /> {r.viewLabel}
                </Link>
              )}
            </div>
          </Card>
        );
      })}

      {/* Inline preview of the curated deck so you can review every card here */}
      {cards.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} className="text-accent" />
            <h2 className="text-lg font-semibold text-ink">
              Deck preview ({cards.length})
            </h2>
          </div>
          <div className="divide-y divide-hairline">
            {cards.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <span className="text-xs text-ink-3 tabular-nums w-6 shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    <MathText>{c.front}</MathText>
                  </p>
                  <p className="text-sm text-ink-2 mt-0.5">
                    <MathText>{c.back}</MathText>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
