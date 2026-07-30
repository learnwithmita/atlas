-- ============================================================================
-- Atlas — initial schema (first slice)
-- Curriculum spine + mastery + streaks + subscriptions + AI cost telemetry
-- Run in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'tutor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edu_level as enum ('G3', 'G2', 'G1', 'O', 'N', 'JC', 'P');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_type as enum ('mcq','structured','open_ended','data_based','diagram','practical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attempt_source as enum ('practice','quiz','mock','scan','assigned','diagnostic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free','plus','pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_cycle as enum ('monthly','annual');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  role          user_role not null default 'student',
  level         edu_level default 'G3',
  exam_year     int,
  -- streak / gamification
  xp            int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  daily_goal_xp int not null default 40,
  created_at    timestamptz not null default now()
);

create table if not exists daily_activity (
  user_id   uuid references profiles(id) on delete cascade,
  day       date not null,
  xp        int not null default 0,
  minutes   int not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Curriculum spine
-- ---------------------------------------------------------------------------
create table if not exists subjects (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  exam_body    text not null default 'SEAB',
  syllabus_code text,
  icon         text,
  sort_order   int default 0
);

create table if not exists topics (
  id          uuid primary key default uuid_generate_v4(),
  subject_id  uuid references subjects(id) on delete cascade,
  name        text not null,
  sort_order  int default 0
);

create table if not exists subtopics (
  id         uuid primary key default uuid_generate_v4(),
  topic_id   uuid references topics(id) on delete cascade,
  name       text not null,
  sort_order int default 0
);

create table if not exists learning_outcomes (
  id          uuid primary key default uuid_generate_v4(),
  subtopic_id uuid references subtopics(id) on delete cascade,
  code        text,
  statement   text not null,
  bloom_level text,
  frequency_score int not null default 3, -- 1..5 how often examined
  embedding   vector(768)
);

create table if not exists lessons (
  id                   uuid primary key default uuid_generate_v4(),
  subtopic_id          uuid references subtopics(id) on delete cascade,
  overview             text,
  simple_explanation   text,
  detailed_explanation text,
  exam_tips            text,
  misconceptions       jsonb default '[]'::jsonb,
  analogy              text
);

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------
create table if not exists questions (
  id            uuid primary key default uuid_generate_v4(),
  subject_id    uuid references subjects(id) on delete cascade,
  subtopic_id   uuid references subtopics(id) on delete set null,
  stem          text not null,
  type          question_type not null default 'structured',
  marks         int not null default 1,
  command_words text[] default '{}',
  difficulty    smallint default 3,
  frequency_score int default 3,
  embedding     vector(768)
);

create table if not exists question_options (
  id          uuid primary key default uuid_generate_v4(),
  question_id uuid references questions(id) on delete cascade,
  label       text,
  text        text,
  is_correct  boolean default false,
  distractor_rationale text
);

create table if not exists mark_schemes (
  question_id      uuid primary key references questions(id) on delete cascade,
  marking_points   jsonb default '[]'::jsonb,
  model_answer     text,
  accepted_keywords text[] default '{}',
  rejected_answers  text[] default '{}'
);

create table if not exists question_outcomes (
  question_id        uuid references questions(id) on delete cascade,
  learning_outcome_id uuid references learning_outcomes(id) on delete cascade,
  weight numeric default 1,
  primary key (question_id, learning_outcome_id)
);

-- ---------------------------------------------------------------------------
-- Student activity + mastery
-- ---------------------------------------------------------------------------
create table if not exists attempts (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references profiles(id) on delete cascade,
  question_id   uuid references questions(id) on delete set null,
  response_text text,
  is_correct    boolean,
  awarded_marks numeric,
  max_marks     numeric,
  time_taken_s  int,
  source        attempt_source default 'practice',
  created_at    timestamptz not null default now()
);

create table if not exists ai_feedback (
  id            uuid primary key default uuid_generate_v4(),
  attempt_id    uuid references attempts(id) on delete cascade,
  awarded_marks numeric,
  missing_points jsonb default '[]'::jsonb,
  misconception_tags text[] default '{}',
  error_type    text, -- conceptual | careless | technique | knowledge
  model_answer  text,
  improved_answer text,
  model_used    text,
  confidence    numeric
);

create table if not exists mastery (
  student_id          uuid references profiles(id) on delete cascade,
  learning_outcome_id uuid references learning_outcomes(id) on delete cascade,
  mastery_score       numeric not null default 0, -- 0..100
  confidence          numeric not null default 0,
  attempts_count      int not null default 0,
  last_practiced_at   timestamptz,
  primary key (student_id, learning_outcome_id)
);

-- ---------------------------------------------------------------------------
-- Subscriptions (temporary — no real Stripe yet)
-- ---------------------------------------------------------------------------
create table if not exists subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete cascade,
  tier       plan_tier not null default 'free',
  cycle      billing_cycle,
  status     text not null default 'active',
  period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI cost telemetry (powers admin analytics)
-- ---------------------------------------------------------------------------
create table if not exists ai_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references profiles(id) on delete set null,
  operation  text not null, -- chat | mark | generate | ocr | classify | embed
  model      text,
  tokens_in  int default 0,
  tokens_out int default 0,
  cost_usd   numeric default 0,
  latency_ms int default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper: current user's role (SECURITY DEFINER avoids RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, tier) values (new.id, 'free')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Streak RPC: call after a study action. Returns the updated streak.
-- ---------------------------------------------------------------------------
create or replace function public.touch_streak(p_xp int default 10, p_minutes int default 1)
returns table (current_streak int, longest_streak int, xp int)
language plpgsql security definer set search_path = public as $$
declare
  v_last date;
  v_streak int;
  v_longest int;
  v_today date := (now() at time zone 'Asia/Singapore')::date;
begin
  select last_active_date, profiles.current_streak, profiles.longest_streak
    into v_last, v_streak, v_longest
  from profiles where id = auth.uid() for update;

  if v_last = v_today then
    null; -- already counted today
  elsif v_last = v_today - 1 then
    v_streak := coalesce(v_streak,0) + 1;
  else
    v_streak := 1;
  end if;

  v_longest := greatest(coalesce(v_longest,0), v_streak);

  update profiles
     set current_streak = v_streak,
         longest_streak = v_longest,
         last_active_date = v_today,
         xp = xp + p_xp
   where id = auth.uid();

  insert into daily_activity (user_id, day, xp, minutes)
  values (auth.uid(), v_today, p_xp, p_minutes)
  on conflict (user_id, day)
  do update set xp = daily_activity.xp + excluded.xp,
                minutes = daily_activity.minutes + excluded.minutes;

  return query select v_streak, v_longest, (select profiles.xp from profiles where id = auth.uid());
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles          enable row level security;
alter table daily_activity     enable row level security;
alter table subjects           enable row level security;
alter table topics             enable row level security;
alter table subtopics          enable row level security;
alter table learning_outcomes  enable row level security;
alter table lessons            enable row level security;
alter table questions          enable row level security;
alter table question_options   enable row level security;
alter table mark_schemes       enable row level security;
alter table question_outcomes  enable row level security;
alter table attempts           enable row level security;
alter table ai_feedback        enable row level security;
alter table mastery            enable row level security;
alter table subscriptions      enable row level security;
alter table ai_events          enable row level security;

-- Profiles: own row read/write; admins read all
create policy "profiles_self_select" on profiles for select using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles_self_update" on profiles for update using (id = auth.uid());

-- Daily activity: own
create policy "activity_own" on daily_activity for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Curriculum content: readable by any authenticated user; admin writes
create policy "content_read_subjects" on subjects for select using (auth.role() = 'authenticated');
create policy "content_read_topics" on topics for select using (auth.role() = 'authenticated');
create policy "content_read_subtopics" on subtopics for select using (auth.role() = 'authenticated');
create policy "content_read_outcomes" on learning_outcomes for select using (auth.role() = 'authenticated');
create policy "content_read_lessons" on lessons for select using (auth.role() = 'authenticated');
create policy "content_read_questions" on questions for select using (auth.role() = 'authenticated');
create policy "content_read_options" on question_options for select using (auth.role() = 'authenticated');
create policy "content_read_ms" on mark_schemes for select using (auth.role() = 'authenticated');
create policy "content_read_qo" on question_outcomes for select using (auth.role() = 'authenticated');

create policy "content_admin_subjects" on subjects for all using (public.current_user_role() = 'admin');
create policy "content_admin_topics" on topics for all using (public.current_user_role() = 'admin');
create policy "content_admin_subtopics" on subtopics for all using (public.current_user_role() = 'admin');
create policy "content_admin_outcomes" on learning_outcomes for all using (public.current_user_role() = 'admin');
create policy "content_admin_lessons" on lessons for all using (public.current_user_role() = 'admin');
create policy "content_admin_questions" on questions for all using (public.current_user_role() = 'admin');
create policy "content_admin_options" on question_options for all using (public.current_user_role() = 'admin');
create policy "content_admin_ms" on mark_schemes for all using (public.current_user_role() = 'admin');
create policy "content_admin_qo" on question_outcomes for all using (public.current_user_role() = 'admin');

-- Student-owned activity data
create policy "attempts_own" on attempts for all
  using (student_id = auth.uid() or public.current_user_role() = 'admin')
  with check (student_id = auth.uid());

create policy "feedback_own" on ai_feedback for select
  using (exists (select 1 from attempts a where a.id = attempt_id and (a.student_id = auth.uid() or public.current_user_role() = 'admin')));
create policy "feedback_insert" on ai_feedback for insert
  using (true) with check (true);

create policy "mastery_own" on mastery for all
  using (student_id = auth.uid() or public.current_user_role() = 'admin')
  with check (student_id = auth.uid());

create policy "subs_own" on subscriptions for all
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid());

-- AI events: user inserts own; admin reads all (for cost dashboard)
create policy "ai_events_insert" on ai_events for insert with check (user_id = auth.uid() or user_id is null);
create policy "ai_events_read" on ai_events for select using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Vector index (fast enough at this scale — see blueprint §5)
create index if not exists idx_outcomes_embedding on learning_outcomes using hnsw (embedding vector_cosine_ops);
create index if not exists idx_questions_embedding on questions using hnsw (embedding vector_cosine_ops);
