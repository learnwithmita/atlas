import LegalDoc from "@/components/LegalDoc";

// noindex while placeholders are unfilled and pending legal review.
export const metadata = {
  title: "Terms of Service · Atlas",
  robots: { index: false, follow: false },
};

const UPDATED = "28 October 2026";

const MD = `## 1. Agreement
These Terms govern your use of Atlas, operated by **[COMPANY NAME]** ("we", "us"). By creating an account or using Atlas, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use Atlas.

## 2. Eligibility
You must be at least **13** years old to use Atlas. If you are under 18, you may use Atlas only with the consent and supervision of a parent, guardian, or your school, who agrees to these Terms on your behalf.

## 3. What Atlas is
Atlas is an AI-assisted study tool for G3 Biology and Chemistry. It provides study notes, practice questions, flashcards, summary sheets, and AI-generated marking and feedback. **Atlas is a study aid, not a substitute for a qualified teacher, and it does not guarantee any examination result or grade.** AI-generated marking and feedback may contain errors; always check important information against your syllabus and your teacher.

## 4. Your account
You are responsible for your account and for keeping your password secure. Tell us promptly if you suspect unauthorised use. You agree to provide accurate information and keep it up to date.

## 5. Acceptable use
You agree not to:
- use Atlas for anything unlawful, or to infringe others' rights;
- share, resell, or redistribute paid content (including summary sheets, which are licensed to you for personal study only);
- attempt to bypass usage limits, access controls, or security; scrape or bulk-extract content; or overload the service;
- upload malicious or infringing material;
- access other users' data or accounts.

## 6. Subscriptions, trials, and billing
Some features require a paid subscription. We offer a **7-day free trial**; if you do not cancel before it ends, your subscription begins and your payment method is charged. Subscriptions **renew automatically** each billing period until cancelled. Prices are shown at checkout, and payments are processed by Stripe.

You can **cancel at any time** from your account's billing page. Cancellation stops future renewals, and you keep access until the end of the period you have already paid for. Refunds are governed by our **Refund Policy**.

## 7. Intellectual property
Atlas and its content (notes, questions, summaries, design, and software) are owned by us or our licensors and are protected by law. We grant you a limited, personal, non-transferable licence to use Atlas and its content for your own study. You may not copy, distribute, or create derivative works except where the app expressly allows it.

## 8. Your content
You keep ownership of the answers and text you submit. You grant us a licence to process and store your submissions to operate Atlas — including sending them to our AI provider for marking, as described in the Privacy Policy.

## 9. Third-party services
Atlas relies on third parties, including Stripe and Google. Your use of those parts may also be subject to their terms. We are not responsible for third-party services.

## 10. Disclaimers
Atlas is provided "as is" and "as available". To the fullest extent permitted by law, we disclaim warranties not expressly stated here, including that Atlas will be uninterrupted or error-free, or that AI output will be accurate or fit for a particular purpose. **[The enforceability of this clause varies by jurisdiction — legal review needed.]**

## 11. Limitation of liability
To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential losses, or for loss of data or profits, arising from your use of Atlas; and our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law — including certain consumer rights, and liability for death or personal injury caused by negligence, or for fraud. **[Legal review needed: some limitations are unenforceable against consumers in the EU, UK, and Singapore.]**

## 12. Suspension and termination
We may suspend or terminate accounts that breach these Terms or misuse Atlas. You may stop using Atlas and close your account at any time.

## 13. Governing law
These Terms are governed by the laws of **Singapore**, and disputes are subject to the courts of Singapore. If you are a consumer in the EU or UK, you keep the mandatory protections and rights of your country of residence, and nothing here removes them. **[Legal review needed for cross-border consumer terms.]**

## 14. Changes
We may update these Terms. We will post changes here and, for significant changes, notify you in the app or by email. Continuing to use Atlas after changes take effect means you accept them.

## 15. Contact
**[COMPANY NAME]** — **[CONTACT EMAIL]**.`;

export default function TermsPage() {
  return <LegalDoc title="Terms of Service" updated={UPDATED} markdown={MD} />;
}
