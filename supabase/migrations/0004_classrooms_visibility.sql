-- ============================================================================
-- Atlas — classrooms + classroom membership, their RLS, and the resource
-- visibility model. Run AFTER 0001_init.sql and 0003_resources.sql. Re-runnable.
-- ============================================================================

-- ── Classrooms & membership tables ──────────────────────────────────────────
create table if not exists classrooms (
  id            uuid primary key default uuid_generate_v4(),
  tutor_id      uuid references profiles(id) on delete cascade,
  name          text not null,
  subject_id    uuid references subjects(id) on delete set null,
  level         edu_level,
  academic_year text,
  invite_code   text unique not null,
  created_at    timestamptz not null default now()
);

create table if not exists classroom_members (
  classroom_id uuid references classrooms(id) on delete cascade,
  student_id   uuid references profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

create index if not exists idx_cm_student on classroom_members(student_id);

-- ── Classrooms & membership RLS ─────────────────────────────────────────────
alter table classrooms         enable row level security;
alter table classroom_members  enable row level security;

drop policy if exists "classrooms_tutor" on classrooms;
create policy "classrooms_tutor" on classrooms for all
  using (tutor_id = auth.uid() or public.current_user_role() = 'admin')
  with check (tutor_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "classrooms_member_read" on classrooms;
create policy "classrooms_member_read" on classrooms for select
  using (exists (
    select 1 from classroom_members m
    where m.classroom_id = id and m.student_id = auth.uid()
  ));

drop policy if exists "cm_tutor" on classroom_members;
create policy "cm_tutor" on classroom_members for all
  using (
    exists (select 1 from classrooms c where c.id = classroom_id and c.tutor_id = auth.uid())
    or public.current_user_role() = 'admin'
  )
  with check (
    exists (select 1 from classrooms c where c.id = classroom_id and c.tutor_id = auth.uid())
    or public.current_user_role() = 'admin'
  );

drop policy if exists "cm_student_read" on classroom_members;
create policy "cm_student_read" on classroom_members for select
  using (student_id = auth.uid());

drop policy if exists "cm_student_join" on classroom_members;
create policy "cm_student_join" on classroom_members for insert
  with check (student_id = auth.uid());

-- ── Resource visibility ─────────────────────────────────────────────────────
-- private = only the uploader; shared = all tutors + admins; public = everyone.
alter table resources add column if not exists visibility text not null default 'private';

-- Admin-uploaded platform materials should be visible to everyone.
update resources r
   set visibility = 'public'
  from profiles p
 where p.id = r.uploaded_by and p.role = 'admin' and r.visibility = 'private';

drop policy if exists "resources_admin_all" on resources;

drop policy if exists "resources_read" on resources;
create policy "resources_read" on resources for select using (
  visibility = 'public'
  or uploaded_by = auth.uid()
  or (visibility = 'shared' and public.current_user_role() in ('tutor', 'admin'))
  or public.current_user_role() = 'admin'
);

drop policy if exists "resources_insert" on resources;
create policy "resources_insert" on resources for insert
  with check (uploaded_by = auth.uid() and public.current_user_role() in ('tutor', 'admin'));

drop policy if exists "resources_update" on resources;
create policy "resources_update" on resources for update
  using (uploaded_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "resources_delete" on resources;
create policy "resources_delete" on resources for delete
  using (uploaded_by = auth.uid() or public.current_user_role() = 'admin');

-- ── Storage: tutors + admins can read/write the private bucket ──────────────
drop policy if exists "resources_bucket_admin" on storage.objects;
drop policy if exists "resources_bucket_rw" on storage.objects;
create policy "resources_bucket_rw" on storage.objects for all
  using (bucket_id = 'resources' and public.current_user_role() in ('tutor', 'admin'))
  with check (bucket_id = 'resources' and public.current_user_role() in ('tutor', 'admin'));
