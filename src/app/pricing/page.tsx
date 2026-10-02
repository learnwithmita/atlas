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
            About S$1 a day.
          </h1>
          <p className="text-lg text-ink-2 mt-4">
            One upper-secondary tuition hour runs S$50–60. Atlas is a tutor-built
            Biology &amp; Chemistry coach — vetted by a tutor with 5+ years&apos;
            experience — for the whole month. Start free; upgrade when you feel
            the difference.
          </p>
        </div>
        <PricingCards />
        <p className="text-center text-sm text-ink-3 mt-12">
          Prices in SGD. Cancel anytime, no questions asked.
        </p>
      </main>
    </>
  );
}
