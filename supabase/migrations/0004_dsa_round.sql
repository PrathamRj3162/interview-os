-- DSA live-coding round. Additive only: safe on existing data.
-- Problems themselves live in code (src/lib/dsa/bank), so only references are stored here.

alter table public.mock_interviews
  add column if not exists problem_slug text check (problem_slug ~ '^[a-z0-9-]{2,80}$'),
  add column if not exists phase text check (phase in ('intro','clarify','brute','optimise','code','test','complexity','wrap')),
  -- Latest editor state: { language, code, codeAtLastTurn, updatedAt }. Bounded so a row can't balloon.
  add column if not exists workspace jsonb check (workspace is null or pg_column_size(workspace) < 200000);

alter table public.submissions
  add column if not exists interview_id uuid references public.mock_interviews(id) on delete set null,
  add column if not exists results jsonb check (results is null or pg_column_size(results) < 100000);
create index if not exists submissions_interview_idx on public.submissions(interview_id, created_at desc);
create index if not exists submissions_user_time_idx on public.submissions(user_id, created_at desc);

-- What happened in the room besides talking: runs, submits, pastes, idle stretches, hints, phase changes.
create table if not exists public.interview_events (
  id bigint generated always as identity primary key,
  interview_id uuid not null references public.mock_interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('run','remote_run','submit','paste','idle','language','hint','phase','reset')),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) < 20000),
  created_at timestamptz not null default now()
);
create index if not exists interview_events_interview_idx on public.interview_events(interview_id, id);
create index if not exists interview_events_user_type_idx on public.interview_events(user_id, type, created_at desc);

alter table public.interview_events enable row level security;
drop policy if exists "own events read" on public.interview_events;
drop policy if exists "own events insert" on public.interview_events;
-- Append-only log: users can read and add their own events, never edit or delete them.
create policy "own events read" on public.interview_events for select to authenticated using (user_id = (select auth.uid()));
create policy "own events insert" on public.interview_events for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.mock_interviews m where m.id = interview_id and m.user_id = (select auth.uid()))
);
grant select, insert on public.interview_events to authenticated;
grant all on public.interview_events to service_role;
grant usage, select on all sequences in schema public to authenticated;
