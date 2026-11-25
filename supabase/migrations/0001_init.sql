-- Interview OS — initial schema
-- Every user-owned table has RLS: a user can only read/write their own rows.
-- Static curriculum content (DSA problems, CS lessons, LLD/HLD material) lives in the
-- repository as versioned data, so learning works even when AI providers are down.

create extension if not exists pgcrypto;

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  target_role text check (target_role in ('sde1','sde_intern','backend','frontend','fullstack','swe')),
  experience_level text check (experience_level in ('beginner','student','intern_applicant','entry','experienced')),
  company_track text check (company_track in ('product','service','startup','general')),
  target_companies text[] not null default '{}',
  preferred_language text check (preferred_language in ('cpp','python','java','javascript')),
  daily_hours numeric(3,1) check (daily_hours > 0 and daily_hours <= 16),
  deadline date,
  dsa_level smallint check (dsa_level between 1 and 5),
  system_design_level smallint check (system_design_level between 1 and 5),
  learning_style text check (learning_style in ('reading','practice','mixed')),
  ai_resume_consent boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────────────────── resumes ─────────────────────────
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,             -- path inside the private "resumes" storage bucket
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  raw_text text,                        -- original extracted text, kept for verification
  parsed jsonb,                         -- structured extraction
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index resumes_user_idx on public.resumes(user_id, created_at desc);

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_scores jsonb not null,           -- deterministic, transparent checks
  ai_findings jsonb,                    -- null when AI was unavailable / not consented
  provider text, model text,
  created_at timestamptz not null default now()
);
create index resume_analyses_resume_idx on public.resume_analyses(resume_id, created_at desc);

create table public.resume_claims (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null,
  section text,
  risk text check (risk in ('low','medium','high')),
  questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index resume_claims_resume_idx on public.resume_claims(resume_id);

-- ───────────────────────── projects ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  title text not null check (char_length(title) <= 200),
  description text,
  technologies text[] not null default '{}',
  repo_url text check (repo_url is null or repo_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$'),
  repo_snapshot jsonb,                  -- which files were actually read
  analysis jsonb,
  created_at timestamptz not null default now()
);
create index projects_user_idx on public.projects(user_id);

-- ───────────────────────── practice & progress ─────────────────────────
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_slug text not null,
  language text not null check (language in ('cpp','python','java','javascript')),
  code text not null check (char_length(code) <= 100000),
  status text not null check (status in ('accepted','wrong_answer','runtime_error','compile_error','time_limit','error')),
  passed integer not null default 0,
  total integer not null default 0,
  runtime_ms integer,
  hints_used smallint not null default 0,
  solve_seconds integer,
  created_at timestamptz not null default now()
);
create index submissions_user_problem_idx on public.submissions(user_id, problem_slug, created_at desc);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('problem','lesson','quiz','lld','hld','behavioral')),
  item_slug text not null,
  topic text,
  status text not null default 'started' check (status in ('started','completed','mastered')),
  best_score numeric(5,2),
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);
create index user_progress_topic_idx on public.user_progress(user_id, topic);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_slug text not null,
  topic text not null,
  score integer not null,
  total integer not null check (total > 0),
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts(user_id, created_at desc);

-- ───────────────────────── mock interviews ─────────────────────────
create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('resume_screen','hr','dsa','fundamentals','project','lld','hld','behavioral','full','company')),
  difficulty text not null check (difficulty in ('beginner','easy','medium','hard','expert')),
  persona text not null,
  company text,
  language text,
  duration_min smallint not null check (duration_min between 5 and 120),
  resume_id uuid references public.resumes(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  overall_score numeric(5,2),
  report jsonb,                         -- rubric scores, each with evidence quotes
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index mock_interviews_user_idx on public.mock_interviews(user_id, started_at desc);

create table public.interview_turns (
  id bigint generated always as identity primary key,
  interview_id uuid not null references public.mock_interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('interviewer','candidate')),
  content text not null check (char_length(content) <= 20000),
  code text,
  created_at timestamptz not null default now()
);
create index interview_turns_interview_idx on public.interview_turns(interview_id, id);

-- ───────────────────────── study planning ─────────────────────────
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inputs jsonb not null,                -- snapshot of performance data used to generate it
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due_date date not null,
  kind text not null check (kind in ('dsa','lesson','quiz','system_design','project','mock','revision','resume')),
  title text not null,
  link text,
  reason text,                          -- why the planner picked it (transparency)
  minutes smallint not null default 30,
  done_at timestamptz
);
create index study_tasks_user_due_idx on public.study_tasks(user_id, due_date);

-- ───────────────────────── revision ─────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_type text, ref_slug text,
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 50000),
  is_mistake boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes(user_id, updated_at desc);
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();

create table public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_type text not null,
  ref_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ref_type, ref_slug)
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (char_length(front) <= 2000),
  back text not null check (char_length(back) <= 5000),
  topic text,
  -- SM-2 spaced repetition state
  ease numeric(4,2) not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index flashcards_due_idx on public.flashcards(user_id, due_at);

-- ───────────────────────── AI usage (quota) ─────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  provider text not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage(user_id, created_at desc);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
create policy "own profile read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['resumes','resume_analyses','resume_claims','projects','submissions',
    'user_progress','quiz_attempts','mock_interviews','interview_turns','study_plans','study_tasks',
    'notes','bookmarks','flashcards']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ai_usage: users may read and append their own usage, never edit or delete it.
alter table public.ai_usage enable row level security;
create policy "own usage read"   on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy "own usage insert" on public.ai_usage for insert to authenticated with check (user_id = (select auth.uid()));

-- Explicit grants (required for Data API access on newer Supabase projects).
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.ai_usage to authenticated;
grant select, insert, update, delete on
  public.resumes, public.resume_analyses, public.resume_claims, public.projects, public.submissions,
  public.user_progress, public.quiz_attempts, public.mock_interviews, public.interview_turns,
  public.study_plans, public.study_tasks, public.notes, public.bookmarks, public.flashcards
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ───────────────────────── Storage: private resume bucket ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- Files must live under "<user_id>/..." and only the owner can touch them.
create policy "resume owner read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
