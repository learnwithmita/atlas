-- ============================================================================
-- Atlas — uploaded resources (syllabus, past papers, mark schemes, notes)
-- + a private Storage bucket for the files.
-- Run AFTER 0001_init.sql. Re-runnable.
--
-- NOTE: this stores the uploaded file + metadata. Auto-extraction of questions
-- (the OCR → segmentation → outcome-mapping pipeline) is the next build; until
-- then, uploads land here with status 'uploaded' for admin review.
-- ============================================================================

do $$ begin
  create type resource_type as enum ('syllabus','past_paper','mark_scheme','notes','worksheet','other');
exception when duplicate_object then null; end $$;

create table if not exists resources (
  id          uuid primary key default uuid_generate_v4(),
  uploaded_by uuid references profiles(id) on delete set null,
  type        resource_type not null default 'other',
  title       text not null,
  subject_id  uuid references subjects(id) on delete set null,
  file_path   text,          -- path within the 'resources' storage bucket
  file_size   bigint,
  status      text not null default 'uploaded', -- uploaded | processing | review | approved | rejected
  created_at  timestamptz not null default now()
);

alter table resources enable row level security;

drop policy if exists "resources_admin_all" on resources;
create policy "resources_admin_all" on resources for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ── Storage bucket (private) ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

-- Only admins can read/write objects in the 'resources' bucket.
drop policy if exists "resources_bucket_admin" on storage.objects;
create policy "resources_bucket_admin" on storage.objects for all
  using (bucket_id = 'resources' and public.current_user_role() = 'admin')
  with check (bucket_id = 'resources' and public.current_user_role() = 'admin');
