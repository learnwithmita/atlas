import LegalDoc from "@/components/LegalDoc";

// noindex while placeholders are unfilled and pending legal review.
export const metadata = {
  title: "Refund Policy · Atlas",
  robots: { index: false, follow: false },
};

const UPDATED = "28 October 2026";

const MD = `## Free trial
Atlas offers a **7-day free trial** before any charge. This is your chance to try the paid features. You can cancel at any time during the trial from your account's billing page, and you will not be charged.

## After you are billed
Once your free trial ends and your subscription is billed, **payments are non-refundable**, except where a refund is required by law. You can **cancel at any time** to stop future renewals; your subscription then stays active until the end of the period you have already paid for, and it will not renew again.

## Your statutory rights
Nothing in this policy removes rights you have under mandatory consumer law.
- If you are a consumer in the **EU or UK**, you may have a 14-day right to cancel a distance purchase. For a digital service that begins immediately, this right can be lost once the service has started with your agreement; where it still applies, contact us and we will honour it.
- In **Singapore** and elsewhere, you keep any non-excludable rights under applicable consumer-protection law. **[Legal review recommended.]**

## Billing errors and exceptional cases
If you were charged in error — for example, charged after cancelling, or charged twice — contact us at **[CONTACT EMAIL]** and we will investigate and, where appropriate, refund you.

## How to cancel
Open your account's **billing** page in Atlas and choose to cancel, or manage your subscription through the billing portal. If you need help, email **[CONTACT EMAIL]**.

## Contact
**[COMPANY NAME]** — **[CONTACT EMAIL]**.`;

export default function RefundPage() {
  return <LegalDoc title="Refund Policy" updated={UPDATED} markdown={MD} />;
}
