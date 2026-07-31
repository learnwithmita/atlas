-- ============================================================================
-- Atlas — practice log: every marked generated-practice answer, so students can
-- review what they wrote and the feedback. Run AFTER 0001. Re-runnable.
-- ============================================================================

create table if not exists practice_log (
  id             uuid primary key default uuid_generate_v4(),
  student_id     uuid references profiles(id) on delete cascade,
  topic_id       uuid references topics(id) on delete set null,
  stem           text not null,
  marks          int,
  answer         text,
  awarded        numeric,
  awarded_points jsonb default '[]'::jsonb,
  missing_points jsonb default '[]'::jsonb,
  model_answer   text,
  improved_answer text,
  feedback       text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_practice_log_student on practice_log(student_id, created_at desc);

alter table practice_log enable row level security;

drop policy if exists "practice_log_own" on practice_log;
create policy "practice_log_own" on practice_log for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
