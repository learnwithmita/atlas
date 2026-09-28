-- ============================================================================
-- Atlas — shared question bank.
-- Practice questions (AI-generated or adapted from papers) are stored ONCE and
-- reused across all students, so 10 students don't trigger 10x the AI calls.
-- Each row carries its own mark scheme + model answer, so answers can be marked
-- against a stored scheme (free keyword match, AI only on borderline cases).
-- Run AFTER 0001. Re-runnable.
-- ============================================================================

create table if not exists generated_questions (
  id            uuid primary key default uuid_generate_v4(),
  topic_id      uuid references topics(id) on delete cascade,
  subject_id    uuid references subjects(id) on delete set null,
  stem          text not null,
  marks         int not null default 2,
  type          text not null default 'structured',
  command_words text[] default '{}',
  -- mark_scheme: [{ "point": "…", "keywords": ["…", "…"] }]
  mark_scheme   jsonb not null default '[]'::jsonb,
  model_answer  text,
  source        text not null default 'ai',   -- 'ai' | 'paper'
  created_by    uuid references profiles(id) on delete set null,
  times_served  int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_genq_topic on generated_questions(topic_id);

alter table generated_questions enable row level security;

-- Everyone signed in may READ the bank (it's shared practice content).
drop policy if exists "genq_read" on generated_questions;
create policy "genq_read" on generated_questions for select
  using (auth.role() = 'authenticated');

-- Only staff may write via a normal session; the app's top-up write-back uses
-- the service-role key (bypasses RLS) so a student session can't inject rows.
drop policy if exists "genq_staff_write" on generated_questions;
create policy "genq_staff_write" on generated_questions for all
  using (public.current_user_role() in ('tutor', 'admin'))
  with check (public.current_user_role() in ('tutor', 'admin'));

-- Link a logged practice attempt back to its bank question, so we can avoid
-- repeating questions a student has already seen and let them revisit.
alter table practice_log
  add column if not exists question_id uuid references generated_questions(id) on delete set null;

create index if not exists idx_practice_log_question on practice_log(student_id, question_id);

-- Spread which bank questions get served (called via the service-role client).
create or replace function public.increment_times_served(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update generated_questions set times_served = times_served + 1
  where id = any(p_ids);
$$;
