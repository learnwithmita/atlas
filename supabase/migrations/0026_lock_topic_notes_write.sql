-- SECURITY FIX: topic_notes are shared, curated revision notes, but the old
-- write policy allowed ANY authenticated user (including students) to insert,
-- update or delete them. Restrict writes to staff (tutor/admin). Reads stay
-- open to all authenticated users.

drop policy if exists "topic_notes_write" on topic_notes;
create policy "topic_notes_write" on topic_notes for all
  using (public.current_user_role() in ('tutor', 'admin'))
  with check (public.current_user_role() in ('tutor', 'admin'));
