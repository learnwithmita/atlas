-- Access log for Pro summary-sheet views. The image route records one row per
-- delivery (who, which topic, when, from where) so a leaked, email-stamped sheet
-- can be cross-checked against who actually opened it. Inserts come from the
-- service-role client in the route, so RLS only needs to gate reads.

create table if not exists summary_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  topic_id    uuid references topics(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  ip          text,
  user_agent  text
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
