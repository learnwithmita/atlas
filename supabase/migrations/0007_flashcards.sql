-- ============================================================================
-- Atlas — flashcards + spaced-repetition reviews (SM-2 lite).
-- Curated cards (created_by null) are shared; students can also generate their
-- own with AI (created_by = them). Run AFTER 0001. Re-runnable.
-- ============================================================================

create table if not exists flashcards (
  id          uuid primary key default uuid_generate_v4(),
  subtopic_id uuid references subtopics(id) on delete cascade,
  topic_id    uuid references topics(id) on delete set null,
  front       text not null,
  back        text not null,
  created_by  uuid references profiles(id) on delete cascade, -- null = curated
  created_at  timestamptz not null default now()
);

create index if not exists idx_flashcards_subtopic on flashcards(subtopic_id);

create table if not exists flashcard_reviews (
  student_id    uuid references profiles(id) on delete cascade,
  flashcard_id  uuid references flashcards(id) on delete cascade,
  ease          numeric not null default 2.5,
  interval_days int not null default 0,
  reps          int not null default 0,
  due_at        timestamptz not null default now(),
  last_reviewed timestamptz,
  primary key (student_id, flashcard_id)
);

create index if not exists idx_reviews_due on flashcard_reviews(student_id, due_at);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table flashcards        enable row level security;
alter table flashcard_reviews enable row level security;

drop policy if exists "flashcards_read" on flashcards;
create policy "flashcards_read" on flashcards for select
  using (
    created_by is null
    or created_by = auth.uid()
    or public.current_user_role() in ('tutor', 'admin')
  );

drop policy if exists "flashcards_insert" on flashcards;
create policy "flashcards_insert" on flashcards for insert
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "flashcards_modify" on flashcards;
create policy "flashcards_modify" on flashcards for all
  using (created_by = auth.uid() or public.current_user_role() = 'admin')
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "reviews_own" on flashcard_reviews;
create policy "reviews_own" on flashcard_reviews for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
