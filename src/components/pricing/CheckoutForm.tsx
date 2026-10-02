"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startCheckout } from "@/app/checkout/actions";
import { PLANS, priceFor, perMonth } from "@/lib/plans";

export function CheckoutForm({
  cycle,
}: {
  cycle: "monthly" | "annual";
}) {
  const plan = PLANS.find((p) => p.id === "pro")!;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function goToStripe() {
    setError(null);
    start(async () => {
      const res = await startCheckout(cycle);
      if (res.url) window.location.href = res.url;
      else setError(res.error ?? "Couldn't start checkout.");
    });
  }

  const total = priceFor(plan, cycle);

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-[1fr_360px] gap-8 items-start">
      <div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
        >
          <ArrowLeft size={16} /> Back to plans
        </Link>

        <h1 className="text-2xl font-semibold text-ink mb-1">Checkout</h1>
        <p className="text-ink-2 mb-6 flex items-center gap-1.5 text-sm">
          <Lock size={14} /> Payment is handled securely by Stripe — we never see
          your card details.
        </p>

        <div className="rounded-[18px] border border-hairline bg-surface-2 p-5 mb-6">
          <p className="text-ink font-medium mb-1">Atlas Pro · 7-day free trial</p>
          <p className="text-sm text-ink-2">
            You won&apos;t be charged today. Stripe&apos;s secure page takes your
            details and starts a 7-day free trial — cancel anytime before it ends
            and you pay nothing.
          </p>
        </div>

        {error && <p className="text-sm text-danger mb-4">{error}</p>}

        <Button size="lg" className="w-full" onClick={goToStripe} disabled={pending}>
          {pending ? "Redirecting…" : "Continue to secure payment"}
          {!pending && <ArrowRight size={18} />}
        </Button>
        <p className="text-xs text-ink-3 mt-3 flex items-center gap-1.5">
          <ShieldCheck size={13} /> Powered by Stripe. Cancel anytime.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-[20px] border border-hairline bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-ink-3 mb-4">Order summary</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-ink font-medium">Atlas {plan.name}</span>
          <span className="text-ink tabular-nums">S${total}</span>
        </div>
        <p className="text-sm text-ink-3 mb-4 capitalize">
          {cycle} · S${perMonth(plan, cycle)}/mo
        </p>
        <div className="border-t border-hairline pt-4 flex items-center justify-between">
          <span className="text-ink font-semibold">Due today</span>
          <span className="text-2xl font-semibold text-ink tabular-nums">S$0</span>
        </div>
        <p className="text-xs text-ink-3 mt-2">
          Then S${total}/{cycle === "annual" ? "year" : "month"} after your 7-day
          free trial.
        </p>
      </div>
    </div>
  );
}
