-- ============================================================================
-- Atlas — syllabus auto-ingest.
-- Subjects gain level (e.g. 'G3') and track ('Pure' / 'Combined') so the same
-- science can exist at several levels. A `syllabuses` table records which
-- syllabus documents an admin has ingested (for the "what's loaded" overview).
-- Run AFTER 0001. Re-runnable.
-- ============================================================================

alter table subjects add column if not exists level text;   -- 'G3', 'G2', 'G1'
alter table subjects add column if not exists track text;    -- 'Pure' | 'Combined'

-- A subject is uniquely a (name, level, track) combination. Guard against
-- duplicate ingests seeding the same subject twice.
create unique index if not exists subjects_name_level_track_idx
  on subjects (name, coalesce(level, ''), coalesce(track, ''));

create table if not exists syllabuses (
  id            uuid primary key default uuid_generate_v4(),
  subject_id    uuid references subjects(id) on delete set null,
  code          text,                       -- e.g. 'K325'
  title         text not null,              -- e.g. 'Biology (G3, Pure)'
  subject_name  text,                       -- 'Biology' / 'Chemistry' / 'Combined Science'
  exam_body     text not null default 'SEAB',
  level         text,                        -- 'G3'
  track         text,                        -- 'Pure' | 'Combined'
  topic_count   int not null default 0,
  subtopic_count int not null default 0,
  outcome_count int not null default 0,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists syllabuses_subject_idx on syllabuses (subject_id);

alter table syllabuses enable row level security;

-- Everyone signed in may see which syllabuses exist; only admins write.
drop policy if exists "syllabuses_read" on syllabuses;
create policy "syllabuses_read" on syllabuses
  for select using (auth.role() = 'authenticated');

drop policy if exists "syllabuses_admin" on syllabuses;
create policy "syllabuses_admin" on syllabuses
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
