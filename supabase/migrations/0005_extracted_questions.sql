-- ============================================================================
-- Atlas — questions extracted from an uploaded paper (OCR pipeline output).
-- Kept separate from the curated `questions` bank: these are AI-detected and
-- await review before being promoted. Run AFTER 0003 + 0004. Re-runnable.
-- ============================================================================

create table if not exists extracted_questions (
  id                  uuid primary key default uuid_generate_v4(),
  resource_id         uuid references resources(id) on delete cascade,
  question_number     text,
  stem                text not null,
  marks               int,
  type                question_type not null default 'structured',
  command_words       text[] default '{}',
  topic_id            uuid references topics(id) on delete set null,
  subtopic_id         uuid references subtopics(id) on delete set null,
  detected_topic_name text,           -- what the model reported (transparency)
  confidence          numeric,        -- 0..1
  created_at          timestamptz not null default now()
);

create index if not exists idx_extracted_resource on extracted_questions(resource_id);

-- Track extraction progress on the resource itself.
alter table resources add column if not exists extracted_count int not null default 0;
alter table resources add column if not exists topics_tested uuid[] default '{}';

-- ── RLS: only the resource's owner (or an admin) can see/manage its questions ─
alter table extracted_questions enable row level security;

drop policy if exists "extracted_owner" on extracted_questions;
create policy "extracted_owner" on extracted_questions for all
  using (
    exists (
      select 1 from resources r
      where r.id = resource_id
        and (r.uploaded_by = auth.uid() or public.current_user_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from resources r
      where r.id = resource_id
        and (r.uploaded_by = auth.uid() or public.current_user_role() = 'admin')
    )
  );
