-- ============================================================================
-- Atlas — security (P0): stop self-service privilege escalation.
--
-- The `profiles_self_update` policy (0001) lets a user update their own row with
-- USING (id = auth.uid()) and NO with-check, and `role` is an ordinary column.
-- Because the anon key is public and tables are reachable through PostgREST, a
-- signed-in user could PATCH their own row to `{"role":"admin"}` and gain admin
-- — which getEntitlement() and every admin API route trust for unlimited access
-- and content-management powers.
--
-- RLS WITH CHECK can only see the NEW row, so it cannot tell that `role` changed.
-- The correct guard is a BEFORE UPDATE trigger that compares OLD vs NEW and
-- rejects a role change unless the caller is an admin. Service-role / SECURITY
-- DEFINER contexts (the webhook, the signup trigger, manual admin promotion via
-- SQL) run with auth.uid() = null and are allowed through, so legitimate writes
-- are unaffected.
--
-- Re-runnable. Run AFTER 0001 and 0021 (needs public.current_user_role()).
-- ============================================================================

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- role unchanged -> always fine (covers full_name and other edits)
  if new.role is not distinct from old.role then
    return new;
  end if;
  -- role changed: only admins, or trusted non-user contexts (service role /
  -- definer, where auth.uid() is null), may do it.
  if auth.uid() is null or public.current_user_role() = 'admin' then
    return new;
  end if;
  raise exception 'changing your own role is not allowed'
    using errcode = '42501'; -- insufficient_privilege
end;
$$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before update of role on public.profiles
  for each row
  execute function public.guard_profile_role();
