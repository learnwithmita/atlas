# Billing & paywall (Stripe)

How Atlas charges for Pro, and exactly what to do to turn it on.

## How it works (plain English)

- **Plans** live in [`src/lib/plans.ts`](src/lib/plans.ts): Free (S$0) and Pro
  (S$39/mo or S$360/yr ≈ S$1/day). Change prices there **and** in Stripe together.
- **Access** is decided on the server by `getEntitlement()` in
  [`src/lib/entitlements.ts`](src/lib/entitlements.ts). Never trust the browser.
- **The switch:** `BILLING_ENABLED`.
  - **OFF (default / now):** everyone is treated as **Pro** — all features open.
    Perfect for testing and early access.
  - **ON:** Free users get a daily AI-marking cap (`FREE_DAILY_MARKS`, default 10)
    and Pro-only features are gated; paying unlocks them.
- **Money** is handled entirely by **Stripe** — card details never touch Atlas
  (so we're not storing cards; Stripe is PCI Level 1).
- **The only thing that grants access** is the Stripe **webhook**
  ([`/api/stripe/webhook`](src/app/api/stripe/webhook/route.ts)). It verifies
  Stripe's signature, then writes the subscription row with the service role.
  The `subscriptions` table is **read-only** to users via RLS — nobody can grant
  themselves Pro.

## What's gated when `BILLING_ENABLED=true`

| Feature | Free | Pro |
|---|---|---|
| Diagnostic, mastery map, study plan | ✅ | ✅ |
| Topic practice from the bank | ✅ | ✅ |
| AI mark-scheme marking | 10 / day | Unlimited |
| Flashcards & fill-the-blanks | ✅ | ✅ |
| Build custom WA papers (multi-topic) | — | ✅ |

Enforced in: `/api/mark`, `/api/mark-open` (daily cap), `/api/paper/generate`
(multi-topic = Pro), and the `/practice/build` page.

## Go-live checklist

1. **Run the migration** `supabase/migrations/0024_billing.sql` in the Supabase
   SQL editor. (Adds Stripe columns, one-row-per-user, and locks down RLS.)
2. **Create a Stripe account** → switch to **Test mode** first.
3. **Create the product**: Products → Add product → "Atlas Pro". Add **two
   prices** (recurring, SGD):
   - Monthly S$39 → copy its **Price ID** (`price_…`)
   - Yearly S$360 → copy its **Price ID**
4. **Add env vars** (Vercel → Project → Settings → Environment Variables; and
   `.env.local` for local):
   ```
   STRIPE_SECRET_KEY=sk_test_…        (then sk_live_… in production)
   STRIPE_WEBHOOK_SECRET=whsec_…      (from step 6)
   STRIPE_PRICE_PRO_MONTHLY=price_…
   STRIPE_PRICE_PRO_ANNUAL=price_…
   # leave BILLING_ENABLED unset until step 7
   ```
5. **Enable the Billing Portal**: Stripe → Settings → Billing → Customer portal →
   activate (lets subscribers cancel / update cards themselves).
6. **Add the webhook**: Stripe → Developers → Webhooks → Add endpoint
   `https://<your-domain>/api/stripe/webhook`, events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   Copy its **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
7. **Flip the switch**: set `BILLING_ENABLED=true` on Vercel and redeploy.
   ⚠️ Only after steps 1–6 — otherwise free users get capped with no way to pay.
8. **Test on a Vercel preview** with Stripe **test cards** (e.g. `4242 4242 4242
   4242`, any future expiry/CVC). Subscribe → confirm the account flips to Pro →
   cancel from the Billing Portal → confirm it reverts at period end.
9. **Go live**: swap the Stripe keys/price IDs to **live mode** values and repeat
   the webhook step with the live endpoint.

## Free trial

Checkout starts a **7-day free trial** (`trial_period_days: 7` in
[`src/app/checkout/actions.ts`](src/app/checkout/actions.ts)). Nothing is charged
on day 0; `trialing` counts as Pro; Stripe charges automatically on day 7 unless
cancelled. Change or remove the number there.

## Things to watch

- **Gemini cost:** "unlimited" marking is bounded by your Gemini quota/budget.
  Watch the admin AI-spend dashboard; the free daily cap protects the rest.
- **Failed renewals:** Stripe auto-retries; access runs to `period_end` (grace).
- **GST (Singapore):** not required under S$1M turnover — don't show GST unless
  registered.
- **Refunds/chargebacks:** issue refunds in Stripe; the portal handles cancels.

## Turning it back off

Set `BILLING_ENABLED=false` (or unset) and redeploy — everyone returns to full
access. Subscription rows are kept; nothing is lost.
