-- ============================================================================
-- Atlas — abuse protection: a shared, serverless-safe rate limiter.
--
-- Vercel functions are stateless and multi-instance, so in-memory limiting is
-- useless. This is a fixed-window counter in Postgres, driven entirely through
-- a SECURITY DEFINER function. The table is locked down (RLS on, no policies,
-- grants revoked) so clients can only ever touch it via check_rate_limit().
--
-- check_rate_limit(key, max, window_seconds) increments the counter for the
-- current window and returns TRUE while the count is within `max`, FALSE once
-- it is exceeded. Callers fail OPEN on error so a limiter hiccup never locks
-- real users out.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.rate_limits (
  bucket     text primary key,
  count      int not null default 0,
  expires_at timestamptz not null
);

alter table public.rate_limits enable row level security;
-- No policies on purpose: with RLS on and nothing granted, clients cannot read
-- or write this table directly — only the definer function below can.
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window bigint := floor(extract(epoch from now()) / p_window_seconds)::bigint;
  v_bucket text := p_key || ':' || v_window::text;
  v_count int;
begin
  insert into public.rate_limits (bucket, count, expires_at)
  values (v_bucket, 1, now() + make_interval(secs => p_window_seconds * 2))
  on conflict (bucket)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup of expired windows (cheap, ~1% of calls).
  if random() < 0.01 then
    delete from public.rate_limits where expires_at < now();
  end if;

  return v_count <= p_max;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
