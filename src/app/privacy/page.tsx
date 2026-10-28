import LegalDoc from "@/components/LegalDoc";

// noindex while placeholders (company name, address, contact, retention, Gemini
// tier) are unfilled and pending legal review. Remove `robots` when finalised.
export const metadata = {
  title: "Privacy Policy · Atlas",
  robots: { index: false, follow: false },
};

const UPDATED = "28 October 2026";

const MD = `## 1. Who we are
Atlas ("Atlas", "we", "us") is a study application operated by **[COMPANY NAME]** (business registration no. **[UEN / REG. NO.]**), of **[REGISTERED ADDRESS]**. We are the controller of the personal data described in this policy.

For any question or request about your data, contact us at **[CONTACT EMAIL]**.

## 2. Scope
This policy explains what personal data we collect when you use Atlas (our website and app), why we collect it, who we share it with, and the choices and rights you have. It applies to students, tutors, and parents or guardians who interact with Atlas.

## 3. The data we collect
**Account data** — your email address, name, role (student or tutor), and, for students, the subjects you study and your level. You give us this when you create an account.

**Learning data** — the answers you submit for practice, the marks and feedback generated for them, your progress and mastery estimates, streaks, and counts of how many answers you have had marked. This is created as you use Atlas.

**Billing data** — if you subscribe, our payment processor (Stripe) collects and processes your payment details. **We do not receive or store your full card number.** We store a Stripe customer and subscription identifier, your plan, its status, and the renewal date.

**Technical data** — standard server logs kept by our hosting and database providers for security and reliability, and a minimal record of when a summary sheet is viewed (your account, the topic, the time, and a coarse device label such as "Chrome · iOS"). This view record does not include your IP address or full browser user-agent.

**Cookies** — Atlas uses only essential cookies needed to keep you securely signed in. We do not use advertising or analytics cookies, or third-party trackers. See section 9.

We do not knowingly collect special-category or sensitive data, and we ask you not to include personal or sensitive information in your practice answers.

## 4. Why we use your data, and our legal bases
- **Provide and operate** your account and the study features — performance of our contract with you.
- **Mark your answers** and generate feedback and questions using AI — performance of our contract.
- **Process subscriptions and payments** — performance of our contract, and compliance with legal (tax and accounting) obligations.
- **Keep Atlas secure** and prevent abuse (rate limiting, access logs) — our legitimate interests in protecting the service and its users.
- **Support you** and respond to your requests — contract and legitimate interests.
- **Comply with the law** — legal obligation.

Under Singapore's Personal Data Protection Act (PDPA) we rely on your consent and on the exceptions the PDPA permits (including for performing a contract with you). For users in the EU and UK, the GDPR / UK GDPR legal bases listed above apply.

## 5. AI processing (please read)
To mark answers and generate study material, Atlas sends the relevant question and your submitted answer to **Google's Gemini API**. We send only what is needed for marking — the question, its mark scheme, and your answer — and we do not deliberately include your name or contact details in those requests.

Google processes this data under its API terms. **[CONFIRM YOUR GEMINI TIER:** on Google's free / AI Studio tier, Google may retain inputs for a limited period and use them to improve its services; on the paid / Vertex AI tier, inputs are not used to train Google's models. We currently use the **[free AI Studio / paid Vertex AI]** tier. If you require that answers are never used to improve Google's models, we recommend the paid tier.**]**

We do not use your answers to train our own models.

## 6. Who we share data with
We share data only with service providers ("processors") that help us run Atlas, under agreements requiring them to protect it:
- **Supabase** — database, authentication, and file storage.
- **Stripe** — payment processing and subscription billing.
- **Google (Gemini API)** — AI marking and content generation (see section 5).
- **Vercel** — application hosting.

We do **not** sell your personal data or share it for advertising. We may disclose data where required by law, or to protect our rights, our users, or the public.

## 7. International transfers
Our providers may store and process data on servers outside Singapore (and outside the EU and UK), including in **[CONFIRM REGION — e.g. the United States]**. Where data is transferred internationally, we rely on the providers' safeguards (for EU and UK data, mechanisms such as Standard Contractual Clauses). **[Confirm regions and transfer mechanisms with your providers.]**

## 8. How long we keep data
We keep your account and learning data for as long as your account is active. If you close your account, or ask us to delete it, we delete or anonymise your personal data within **[RETENTION PERIOD — e.g. 30 days]**, except where we must keep certain records (for example billing and tax records) for the period required by law. **[Confirm retention periods.]**

## 9. Cookies
Atlas sets only the cookies required for authentication (keeping you securely signed in) and basic security. These are strictly necessary cookies and do not require consent. We do not use analytics, advertising, or cross-site tracking cookies. If this ever changes, we will update this policy and, where required, ask for your consent first.

## 10. Security
We protect your data with measures including: encrypted connections (HTTPS); encryption of stored data by our database provider; passwords handled and hashed by our authentication provider (we never see your password); database row-level security so users can only reach their own records; server-side authorisation checks; and rate limiting. No method is perfectly secure, but we work to protect your information and review our controls.

## 11. Children and students
Atlas is designed for students, who may be under 18. You must be at least **13** to create an account. If you are under 18, you may use Atlas only with the involvement and consent of a parent, guardian, or your school. Parents, guardians, and schools may contact us at **[CONTACT EMAIL]** to access, correct, or delete a child's data. We do not knowingly collect data from children under 13; if we learn that we have, we will delete it.

## 12. Your rights
Depending on where you live, you have rights over your personal data:
- **Access** a copy of your data, and **correct** inaccurate data.
- **Delete** your data and close your account.
- (EU / UK) **Restrict** or **object** to processing, and **data portability**.
- (PDPA) **Withdraw consent**, and ask how your data has been used or disclosed.

To exercise any right, email **[CONTACT EMAIL]**. You can request account deletion and a copy of your data by emailing us, and we will action it within the time required by law. You also have the right to complain to a data protection authority — in Singapore, the **Personal Data Protection Commission (PDPC)**; in the EU or UK, your local supervisory authority (for example, the UK Information Commissioner's Office).

## 13. Changes to this policy
We may update this policy. We will post the new version here and update the "last updated" date; we will notify you of significant changes in the app or by email.

## 14. Contact
**[COMPANY NAME]** — **[CONTACT EMAIL]** — **[REGISTERED ADDRESS]**.`;

export default function PrivacyPage() {
  return <LegalDoc title="Privacy Policy" updated={UPDATED} markdown={MD} />;
}
