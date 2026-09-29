-- ============================================================================
-- Atlas — fix infinite RLS recursion between classrooms and classroom_members.
-- The classrooms policy referenced classroom_members and the classroom_members
-- policy referenced classrooms, so evaluating either (e.g. via the flashcards
-- read policy's classroom check) recursed forever — which made students unable
-- to read flashcards ("infinite recursion detected in policy").
--
-- Fix: check ownership/membership through SECURITY DEFINER functions, which run
-- as the owner and bypass RLS, so the policies no longer reference each other.
-- Run AFTER 0004 + 0014. Re-runnable.
-- ============================================================================

create or replace function public.owns_classroom(p_classroom uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from classrooms c where c.id = p_classroom and c.tutor_id = auth.uid()
  );
$$;

create or replace function public.is_classroom_member(p_classroom uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from classroom_members m
    where m.classroom_id = p_classroom and m.student_id = auth.uid()
  );
$$;

-- classroom_members: tutor of the class manages rows (no longer references
-- the classrooms policy directly).
drop policy if exists "cm_tutor" on classroom_members;
create policy "cm_tutor" on classroom_members for all
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

-- classrooms: members can read their class (no longer references the
-- classroom_members policy directly).
drop policy if exists "classrooms_member_read" on classrooms;
create policy "classrooms_member_read" on classrooms for select
  using (tutor_id = auth.uid() or public.is_classroom_member(id));

-- flashcards: read shared, own, staff, or a card assigned to a class you're in
-- (via the definer function, so no recursion).
drop policy if exists "flashcards_read" on flashcards;
create policy "flashcards_read" on flashcards for select
  using (
    created_by is null
    or created_by = auth.uid()
    or public.current_user_role() in ('tutor', 'admin')
    or (classroom_id is not null and public.is_classroom_member(classroom_id))
  );
