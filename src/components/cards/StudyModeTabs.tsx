import Link from "next/link";
import { cn } from "@/lib/utils";

/** Toggle between the two study modes. */
export function StudyModeTabs({ active }: { active: "cards" | "blanks" }) {
  const tabs = [
    { key: "cards", label: "Flashcards", href: "/cards" },
    { key: "blanks", label: "Fill the blanks", href: "/blanks" },
  ] as const;
  return (
    <div className="flex gap-1.5 p-1 rounded-full bg-surface-2 w-fit mb-6">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "h-9 px-5 rounded-full text-sm font-medium transition-all",
            active === t.key ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
