"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PLANS, perMonth, type Plan } from "@/lib/plans";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function PricingCards() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");
  const router = useRouter();

  function choose(plan: Plan) {
    if (plan.id === "free") {
      router.push("/signup");
      return;
    }
    router.push(`/checkout?plan=${plan.id}&cycle=${cycle}`);
  }

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <div className="flex gap-1 p-1 rounded-full bg-surface-2 border border-hairline">
          {(["monthly", "annual"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn(
                "h-9 px-5 rounded-full text-sm font-medium capitalize transition-all",
                cycle === c ? "bg-surface text-ink shadow-sm" : "text-ink-2"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <Badge tone="mint">Save ~33% annually</Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-[24px] p-7 border transition-all flex flex-col",
              plan.highlight
                ? "border-accent bg-surface shadow-lg md:scale-[1.03]"
                : "border-hairline bg-surface shadow-sm"
            )}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </span>
            )}
            <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
            <p className="text-sm text-ink-3 mt-1">{plan.tagline}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold text-ink tabular-nums">
                ${perMonth(plan, cycle)}
              </span>
              <span className="text-ink-3">/mo</span>
            </div>
            <p className="text-xs text-ink-3 mt-1 h-4">
              {plan.id !== "free" && cycle === "annual"
                ? `billed $${plan.annual}/year`
                : plan.id !== "free"
                ? "billed monthly"
                : "free forever"}
            </p>

            <Button
              className="w-full mt-6"
              variant={plan.highlight ? "primary" : "secondary"}
              onClick={() => choose(plan)}
            >
              {plan.id === "free" ? "Get started" : `Choose ${plan.name}`}
            </Button>

            <ul className="mt-7 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-ink-2">
                  <Check
                    size={18}
                    className="text-accent shrink-0 mt-0.5"
                    strokeWidth={2.5}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
