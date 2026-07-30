-- ============================================================================
-- Atlas — demo progress generator.
-- Fills the CURRENT user's mastery, streak, XP, daily activity and a few
-- attempts with realistic values so the dashboard + analytics look alive.
-- Called from the app's "Load sample progress" affordance. Idempotent-ish.
-- ============================================================================

create or replace function public.seed_demo_progress()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Singapore')::date;
  r record;
  i int;
  v_score numeric;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Mastery across all seeded outcomes with a believable spread
  for r in select id, frequency_score from learning_outcomes loop
    v_score := case
      when r.frequency_score >= 5 then 30 + floor(random()*25)  -- high-freq, weaker
      when r.frequency_score = 4 then 45 + floor(random()*30)
      else 60 + floor(random()*35)
    end;
    insert into mastery (student_id, learning_outcome_id, mastery_score, confidence, attempts_count, last_practiced_at)
    values (v_uid, r.id, v_score, 0.4 + random()*0.5, 3 + floor(random()*8), now() - (random()*10 || ' days')::interval)
    on conflict (student_id, learning_outcome_id)
    do update set mastery_score = excluded.mastery_score,
                  confidence = excluded.confidence,
                  attempts_count = excluded.attempts_count,
                  last_practiced_at = excluded.last_practiced_at;
  end loop;

  -- Streak + XP + 14 days of activity
  update profiles
     set current_streak = 7,
         longest_streak = 12,
         last_active_date = v_today,
         xp = 1240
   where id = v_uid;

  for i in 0..13 loop
    insert into daily_activity (user_id, day, xp, minutes)
    values (v_uid, v_today - i, case when i < 7 then 30 + floor(random()*50) else floor(random()*60) end, 5 + floor(random()*25))
    on conflict (user_id, day) do update set xp = excluded.xp, minutes = excluded.minutes;
  end loop;

  -- A handful of attempts on the osmosis question
  insert into attempts (student_id, question_id, response_text, is_correct, awarded_marks, max_marks, time_taken_s, source, created_at)
  values
    (v_uid, '10000000-0000-0000-0000-000000000001', 'Osmosis is the movement of water across a membrane.', false, 2, 3, 95, 'practice', now() - interval '2 days'),
    (v_uid, '10000000-0000-0000-0000-000000000004', 'B', true, 1, 1, 20, 'practice', now() - interval '1 day')
  on conflict do nothing;
end $$;
