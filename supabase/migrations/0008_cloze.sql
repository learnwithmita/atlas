-- ============================================================================
-- Atlas — fill-in-the-blank (cloze) items. Curated (created_by null) + AI/own.
-- `text` holds the sentence with the blanked answer wrapped in {{ }}.
-- Run AFTER 0001. Re-runnable.
-- ============================================================================

create table if not exists cloze_items (
  id          uuid primary key default uuid_generate_v4(),
  subtopic_id uuid references subtopics(id) on delete cascade,
  topic_id    uuid references topics(id) on delete set null,
  text        text not null,   -- e.g. "Water moves by {{osmosis}} across a membrane."
  answer      text not null,   -- e.g. "osmosis"
  created_by  uuid references profiles(id) on delete cascade, -- null = curated
  created_at  timestamptz not null default now()
);

create index if not exists idx_cloze_subtopic on cloze_items(subtopic_id);

alter table cloze_items enable row level security;

drop policy if exists "cloze_read" on cloze_items;
create policy "cloze_read" on cloze_items for select
  using (
    created_by is null
    or created_by = auth.uid()
    or public.current_user_role() in ('tutor', 'admin')
  );

drop policy if exists "cloze_insert" on cloze_items;
create policy "cloze_insert" on cloze_items for insert
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "cloze_modify" on cloze_items;
create policy "cloze_modify" on cloze_items for all
  using (created_by = auth.uid() or public.current_user_role() = 'admin')
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');
