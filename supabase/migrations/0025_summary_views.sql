-- Access log for Pro summary-sheet views. The image route records one row per
-- delivery so a leaked, email-stamped sheet can be cross-checked against who
-- opened it. Kept deliberately minimal (data minimisation): account, topic,
-- time, and a COARSE device label (e.g. "Chrome · iOS") — no IP address and no
-- full user-agent. Inserts come from the service-role client in the route, so
-- RLS only needs to gate reads.
--
-- Retention: rows are purged after 90 days. The app does this best-effort from
-- the image route; if pg_cron is enabled you can also run it server-side (see
-- the optional block at the end).

create table if not exists summary_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  topic_id    uuid references topics(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  device      text
);

create index if not exists summary_views_user_idx on summary_views(user_id);
create index if not exists summary_views_topic_idx on summary_views(topic_id);
create index if not exists summary_views_time_idx on summary_views(viewed_at);

alter table summary_views enable row level security;

-- Admins can read the log; nobody reads it through the anon/auth client otherwise.
drop policy if exists "admins read summary_views" on summary_views;
create policy "admins read summary_views" on summary_views
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Optional server-side 90-day purge (only runs if pg_cron is enabled; harmless
-- to leave in if it isn't). The app also purges best-effort, so this is a belt.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-summary-views',
      '0 3 * * *',
      $cmd$delete from summary_views where viewed_at < now() - interval '90 days'$cmd$
    );
  end if;
end;
$$;
