-- ============================================================================
-- Atlas — security: signup can only create students or tutors, never admins.
-- The anon key is public, so a crafted auth.signUp could put role:'admin' in
-- user metadata. Harden the trigger so it ignores that and only ever honours
-- 'tutor' or 'student'. Admins are promoted manually:
--     update profiles set role = 'admin' where email = 'you@example.com';
-- Run AFTER 0001. Re-runnable.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  -- Only 'tutor' is honoured from signup metadata; everything else -> student.
  v_role := case
    when new.raw_user_meta_data->>'role' = 'tutor' then 'tutor'::user_role
    else 'student'::user_role
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    v_role
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, tier) values (new.id, 'free')
  on conflict do nothing;
  return new;
end $$;
