"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { completeCheckout } from "@/app/checkout/actions";
import { PLANS, priceFor, perMonth } from "@/lib/plans";

export function CheckoutForm({
  planId,
  cycle,
}: {
  planId: "plus" | "pro";
  cycle: "monthly" | "annual";
}) {
  const plan = PLANS.find((p) => p.id === planId)!;
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pay() {
    setError(null);
    start(async () => {
      const res = await completeCheckout(planId, cycle);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16 animate-fade-up">
        <div className="h-16 w-16 mx-auto rounded-full bg-mint/15 grid place-items-center mb-6">
          <Check className="text-mint" size={30} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-semibold text-ink mb-2">
          You&apos;re on {plan.name}
        </h1>
        <p className="text-ink-2 mb-8">
          This is a preview checkout — no charge was made. Your account now
          reflects the {plan.name} tier.
        </p>
        <LinkButton href="/learn" size="lg">
          Go to Atlas
        </LinkButton>
      </div>
    );
  }

  const total = priceFor(plan, cycle);

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-[1fr_360px] gap-8 items-start">
      {/* Payment form (preview / mock) */}
      <div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6"
        >
          <ArrowLeft size={16} /> Back to plans
        </Link>

        <h1 className="text-2xl font-semibold text-ink mb-1">Checkout</h1>
        <p className="text-ink-2 mb-6 flex items-center gap-1.5 text-sm">
          <Lock size={14} /> Preview checkout — no real payment is processed.
        </p>

        <div className="space-y-4 opacity-90">
          <Field label="Card number">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-ink-3" />
              <input
                disabled
                placeholder="4242 4242 4242 4242"
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-3"
              />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry">
              <input
                disabled
                placeholder="12 / 28"
                className="w-full bg-transparent outline-none text-ink placeholder:text-ink-3"
              />
            </Field>
            <Field label="CVC">
              <input
                disabled
                placeholder="123"
                className="w-full bg-transparent outline-none text-ink placeholder:text-ink-3"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-danger mt-4">{error}</p>}

        <Button
          size="lg"
          className="w-full mt-6"
          onClick={pay}
          disabled={pending}
        >
          {pending ? "Processing…" : `Complete — pay $${total}`}
        </Button>
        <p className="text-xs text-ink-3 mt-3 flex items-center gap-1.5">
          <ShieldCheck size={13} /> Stripe will replace this preview before
          launch.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-[20px] border border-hairline bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-ink-3 mb-4">Order summary</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-ink font-medium">Atlas {plan.name}</span>
          <span className="text-ink tabular-nums">${total}</span>
        </div>
        <p className="text-sm text-ink-3 mb-4 capitalize">
          {cycle} · ${perMonth(plan, cycle)}/mo
        </p>
        <div className="border-t border-hairline pt-4 flex items-center justify-between">
          <span className="text-ink font-semibold">Total today</span>
          <span className="text-2xl font-semibold text-ink tabular-nums">
            ${total}
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-3 mb-1.5 block">
        {label}
      </span>
      <div className="h-12 px-4 flex items-center rounded-[14px] bg-surface-2 border border-hairline">
        {children}
      </div>
    </label>
  );
}
