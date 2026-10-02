-- ---------------------------------------------------------------------------
-- 0024 · Stripe billing
-- ---------------------------------------------------------------------------
-- Link each subscription to its Stripe objects and make status + period_end the
-- single source of truth for access. The Stripe webhook (service role) is the
-- ONLY writer of these fields — clients can read their own row but never grant
-- themselves a tier.
alter table subscriptions add column if not exists stripe_customer_id     text;
alter table subscriptions add column if not exists stripe_subscription_id text;
alter table subscriptions add column if not exists price_id               text;
alter table subscriptions add column if not exists cancel_at_period_end   boolean not null default false;
alter table subscriptions add column if not exists updated_at             timestamptz not null default now();

-- One subscription row per user (upsert target). De-dupe any existing rows,
-- keeping the most recently created, before adding the constraint.
delete from subscriptions s
using subscriptions s2
where s.user_id = s2.user_id
  and s.created_at < s2.created_at;

create unique index if not exists subscriptions_user_id_key on subscriptions (user_id);
create index if not exists subscriptions_stripe_customer_idx on subscriptions (stripe_customer_id);

-- Tighten RLS: a user may READ their own subscription, but all WRITES go through
-- the service-role webhook (which bypasses RLS). Remove any self-insert/update
-- policy from earlier so a student can never set their own tier.
-- The original policy ("subs_own ... for all") let a user write their own
-- subscription — which is exactly the self-grant hole. Replace it with a
-- read-only policy; all writes now go through the service-role webhook.
drop policy if exists "subs_own" on subscriptions;
drop policy if exists "subscriptions_self_select" on subscriptions;

create policy "subscriptions_self_select" on subscriptions
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');
-- No insert/update/delete policies ⇒ only the service role can write.
