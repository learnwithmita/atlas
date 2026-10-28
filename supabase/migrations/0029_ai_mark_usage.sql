-- ============================================================================
-- Atlas — billing integrity (P1): a reliable daily AI-marking ledger.
--
-- The daily mark cap (canMarkNow / marksUsedToday) counted `practice_log` rows,
-- but only mark-open's ad-hoc/bank path writes there — structured marking
-- (/api/mark) and assignment marking never did, so they slipped the cap. Once
-- billing is on, a free user could mark unlimited answers for free-to-them /
-- paid-for-us Gemini calls.
--
-- This ledger records one row per billable AI mark, from every marking path.
-- marksUsedToday() counts it. Users may read and append their own rows but not
-- update or delete them (no such policy = default deny), so the cap can't be
-- reset by tampering. Cleanup of old rows is done server-side (service role).
--
-- Re-runnable. Run AFTER 0001 and 0021 (needs public.current_user_role()).
-- ============================================================================

create table if not exists public.ai_mark_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'mark',
  created_at timestamptz not null default now()
);

create index if not exists ai_mark_usage_user_day
  on public.ai_mark_usage (user_id, created_at);

alter table public.ai_mark_usage enable row level security;

drop policy if exists "ai_mark_usage_self_select" on public.ai_mark_usage;
create policy "ai_mark_usage_self_select" on public.ai_mark_usage
  for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "ai_mark_usage_self_insert" on public.ai_mark_usage;
create policy "ai_mark_usage_self_insert" on public.ai_mark_usage
  for insert with check (user_id = auth.uid());
