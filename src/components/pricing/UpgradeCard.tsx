import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

/** Inline upsell shown where a free user hits a Pro-only feature. */
export function UpgradeCard({
  title = "This is a Pro feature",
  body = "Upgrade to Atlas Pro to unlock it.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <Card className="p-8 text-center max-w-md mx-auto">
      <div className="h-12 w-12 mx-auto rounded-[16px] bg-accent-soft grid place-items-center mb-4">
        <Sparkles className="text-accent" size={22} />
      </div>
      <h2 className="text-xl font-semibold text-ink mb-1">{title}</h2>
      <p className="text-ink-2 mb-6">{body}</p>
      <LinkButton href="/pricing" size="lg">
        See Pro plans
      </LinkButton>
    </Card>
  );
}
