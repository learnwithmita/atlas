-- ============================================================================
-- Atlas — tutor insights (weak areas).
-- Student mastery/practice rows are private (RLS: *_own). These SECURITY
-- DEFINER functions let a classroom's tutor read AGGREGATES for their own
-- class only — the join to `classrooms` enforces ownership, so a caller who
-- isn't the tutor (or an admin) gets no rows. Run AFTER 0009. Re-runnable.
-- ============================================================================

-- Weakest topics across the class, by average practice score.
create or replace function public.tutor_class_weak_topics(p_classroom_id uuid)
returns table (
  topic_id   uuid,
  topic_name text,
  subject    text,
  attempts   bigint,
  avg_pct    numeric,
  students   bigint
)
language sql security definer set search_path = public as $$
  select t.id, t.name, coalesce(s.name, ''),
         count(*)::bigint,
         round(avg(case when pl.marks > 0 then (pl.awarded::numeric / pl.marks) * 100 end))::numeric,
         count(distinct pl.student_id)::bigint
  from practice_log pl
  join classroom_members m
    on m.student_id = pl.student_id and m.classroom_id = p_classroom_id
  join classrooms c
    on c.id = p_classroom_id
   and (c.tutor_id = auth.uid() or public.current_user_role() = 'admin')
  join topics t on t.id = pl.topic_id
  left join subjects s on s.id = t.subject_id
  group by t.id, t.name, s.name
  order by avg_pct asc nulls last;
$$;

-- Per-student summary (weakest first). Members with no practice sort last.
create or replace function public.tutor_class_students(p_classroom_id uuid)
returns table (
  student_id uuid,
  name       text,
  attempts   bigint,
  avg_pct    numeric
)
language sql security definer set search_path = public as $$
  select p.id, coalesce(p.full_name, p.email),
         count(pl.id)::bigint,
         round(avg(case when pl.marks > 0 then (pl.awarded::numeric / pl.marks) * 100 end))::numeric
  from classroom_members m
  join classrooms c
    on c.id = p_classroom_id
   and (c.tutor_id = auth.uid() or public.current_user_role() = 'admin')
  join profiles p on p.id = m.student_id
  left join practice_log pl on pl.student_id = m.student_id
  where m.classroom_id = p_classroom_id
  group by p.id, p.full_name, p.email
  order by avg_pct asc nulls last;
$$;
