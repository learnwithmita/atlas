-- ---------------------------------------------------------------------------
-- 0023 · Student subject selection (onboarding)
-- ---------------------------------------------------------------------------
-- A student picks what they're studying at signup so the app only shows their
-- syllabus. Stored as a small vocabulary of tokens rather than subject ids so
-- it survives a re-seed (ids change; tokens don't):
--   'combined'  → Combined Science
--   'biology'   → Pure Biology
--   'chemistry' → Pure Chemistry
-- A student may take Combined alone, or one/both pure subjects.
alter table profiles add column if not exists study_subjects text[];

-- Capture level + subjects chosen at signup (passed in auth metadata) when the
-- profile row is first created. Existing students are prompted in-app to choose,
-- which writes this column directly.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta_subjects text[];
begin
  -- raw_user_meta_data->'study_subjects' is a JSON array of strings.
  begin
    select array(select jsonb_array_elements_text(new.raw_user_meta_data->'study_subjects'))
      into meta_subjects;
  exception when others then
    meta_subjects := null;
  end;

  insert into public.profiles (id, email, full_name, role, level, study_subjects)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce((new.raw_user_meta_data->>'level')::edu_level, 'G3'),
    case when meta_subjects is not null and array_length(meta_subjects, 1) > 0
         then meta_subjects else null end
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, tier) values (new.id, 'free')
  on conflict do nothing;
  return new;
end;
$$;
