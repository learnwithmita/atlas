-- ============================================================================
-- Atlas — flashcard authoring & class assignment.
-- Students and tutors can already create their own cards (created_by). This
-- adds classroom sharing: a tutor's card tagged with classroom_id becomes
-- visible to every student in that class, so a tutor can "build a deck and
-- assign it". Run AFTER 0007 + 0004. Re-runnable.
-- ============================================================================

alter table flashcards
  add column if not exists classroom_id uuid references classrooms(id) on delete cascade;

create index if not exists idx_flashcards_classroom on flashcards(classroom_id);

-- Read: curated (created_by null), your own, staff, OR a card assigned to a
-- class you belong to.
drop policy if exists "flashcards_read" on flashcards;
create policy "flashcards_read" on flashcards for select
  using (
    created_by is null
    or created_by = auth.uid()
    or public.current_user_role() in ('tutor', 'admin')
    or (
      classroom_id is not null
      and exists (
        select 1 from classroom_members m
        where m.classroom_id = flashcards.classroom_id
          and m.student_id = auth.uid()
      )
    )
  );

-- Insert / modify unchanged in spirit: you own what you make (admins anything).
-- A tutor sets created_by = themselves and may attach a classroom_id they own.
drop policy if exists "flashcards_insert" on flashcards;
create policy "flashcards_insert" on flashcards for insert
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "flashcards_modify" on flashcards;
create policy "flashcards_modify" on flashcards for all
  using (created_by = auth.uid() or public.current_user_role() = 'admin')
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');
