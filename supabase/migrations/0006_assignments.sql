-- ============================================================================
-- Atlas — assignments. A tutor assigns a set of questions (snapshotted from an
-- extracted paper or the bank) to a whole class or a single student.
-- Run AFTER 0004 + 0005. Re-runnable.
-- ============================================================================

create table if not exists assignments (
  id           uuid primary key default uuid_generate_v4(),
  tutor_id     uuid references profiles(id) on delete cascade,
  title        text not null,
  classroom_id uuid references classrooms(id) on delete cascade,
  student_id   uuid references profiles(id) on delete cascade, -- null = whole class
  due_at       timestamptz,
  created_at   timestamptz not null default now()
);

-- Snapshot of the questions at assign time (decoupled from extracted_questions).
create table if not exists assignment_questions (
  id            uuid primary key default uuid_generate_v4(),
  assignment_id uuid references assignments(id) on delete cascade,
  stem          text not null,
  marks         int,
  type          question_type not null default 'open_ended',
  command_words text[] default '{}',
  topic_id      uuid references topics(id) on delete set null,
  sort_order    int default 0
);

create table if not exists assignment_submissions (
  assignment_id uuid references assignments(id) on delete cascade,
  student_id    uuid references profiles(id) on delete cascade,
  status        text not null default 'assigned', -- assigned | in_progress | submitted
  score         numeric,
  max_score     numeric,
  submitted_at  timestamptz,
  primary key (assignment_id, student_id)
);

create index if not exists idx_assign_classroom on assignments(classroom_id);
create index if not exists idx_aq_assignment on assignment_questions(assignment_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table assignments            enable row level security;
alter table assignment_questions   enable row level security;
alter table assignment_submissions enable row level security;

-- Assignments: tutor/admin manage own; students read those targeted to them.
drop policy if exists "assign_owner" on assignments;
create policy "assign_owner" on assignments for all
  using (tutor_id = auth.uid() or public.current_user_role() = 'admin')
  with check (tutor_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "assign_student_read" on assignments;
create policy "assign_student_read" on assignments for select
  using (
    student_id = auth.uid()
    or (
      student_id is null
      and exists (
        select 1 from classroom_members m
        where m.classroom_id = classroom_id and m.student_id = auth.uid()
      )
    )
  );

-- Assignment questions: readable by anyone who can read the parent assignment.
drop policy if exists "aq_read" on assignment_questions;
create policy "aq_read" on assignment_questions for select
  using (
    exists (
      select 1 from assignments a
      where a.id = assignment_id
        and (
          a.tutor_id = auth.uid()
          or public.current_user_role() = 'admin'
          or a.student_id = auth.uid()
          or (a.student_id is null and exists (
                select 1 from classroom_members m
                where m.classroom_id = a.classroom_id and m.student_id = auth.uid()))
        )
    )
  );

drop policy if exists "aq_write" on assignment_questions;
create policy "aq_write" on assignment_questions for all
  using (
    exists (select 1 from assignments a where a.id = assignment_id
            and (a.tutor_id = auth.uid() or public.current_user_role() = 'admin'))
  )
  with check (
    exists (select 1 from assignments a where a.id = assignment_id
            and (a.tutor_id = auth.uid() or public.current_user_role() = 'admin'))
  );

-- Submissions: students own their own; the assignment's tutor can read.
drop policy if exists "asub_student" on assignment_submissions;
create policy "asub_student" on assignment_submissions for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "asub_tutor_read" on assignment_submissions;
create policy "asub_tutor_read" on assignment_submissions for select
  using (
    exists (select 1 from assignments a where a.id = assignment_id
            and (a.tutor_id = auth.uid() or public.current_user_role() = 'admin'))
  );

-- ── Join a class by invite code ─────────────────────────────────────────────
-- SECURITY DEFINER: a student isn't a member yet, so RLS would hide the class.
create or replace function public.join_classroom(p_code text)
returns table (classroom_id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  select id, classrooms.name into v_id, v_name
  from classrooms where upper(invite_code) = upper(trim(p_code));
  if v_id is null then
    raise exception 'No class found for that code';
  end if;
  insert into classroom_members (classroom_id, student_id)
  values (v_id, auth.uid())
  on conflict do nothing;
  return query select v_id, v_name;
end $$;
