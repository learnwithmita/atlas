import { SiteHeader } from "@/components/site/SiteHeader";
import { PricingCards } from "@/components/pricing/PricingCards";

export const metadata = { title: "Pricing · Atlas" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight">
            Cheaper than one tuition session.
          </h1>
          <p className="text-lg text-ink-2 mt-4">
            A private examiner-grade tutor, every day of the month. Start free —
            upgrade when you feel the difference.
          </p>
        </div>
        <PricingCards />
        <p className="text-center text-sm text-ink-3 mt-12">
          Prices in SGD. Cancel anytime. Payments are a preview in this build.
        </p>
      </main>
    </>
  );
}
