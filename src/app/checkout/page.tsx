import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CheckoutForm } from "@/components/pricing/CheckoutForm";

export const metadata = { title: "Checkout · Atlas" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const { plan, cycle } = await searchParams;
  if (plan !== "plus" && plan !== "pro") redirect("/pricing");
  const billing = cycle === "monthly" ? "monthly" : "annual";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
        <CheckoutForm planId={plan} cycle={billing} />
      </main>
    </>
  );
}
