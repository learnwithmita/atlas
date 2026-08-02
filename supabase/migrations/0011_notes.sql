-- ============================================================================
-- Atlas — topic notes: AI-generated key points + common misconceptions (cached,
-- shared) plus each student's own editable notes. Run AFTER 0001. Re-runnable.
-- ============================================================================

create table if not exists topic_notes (
  topic_id       uuid primary key references topics(id) on delete cascade,
  key_points     jsonb not null default '[]'::jsonb,   -- array of strings
  misconceptions jsonb not null default '[]'::jsonb,   -- array of {claim, correction}
  updated_at     timestamptz not null default now()
);

create table if not exists student_notes (
  student_id uuid references profiles(id) on delete cascade,
  topic_id   uuid references topics(id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

alter table topic_notes   enable row level security;
alter table student_notes enable row level security;

-- Shared AI notes: any signed-in user can read; any can upsert (generated once).
drop policy if exists "topic_notes_read" on topic_notes;
create policy "topic_notes_read" on topic_notes for select
  using (auth.role() = 'authenticated');
drop policy if exists "topic_notes_write" on topic_notes;
create policy "topic_notes_write" on topic_notes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Personal notes: own only.
drop policy if exists "student_notes_own" on student_notes;
create policy "student_notes_own" on student_notes for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
