-- 0005 · Public profiles (opt-in), notifications read state, interview ratings,
-- and server-only writes for everything that feeds scores, XP and public stats.
-- Additive and idempotent.

-- ───────────── Profiles: opt-in public page + notifications ─────────────
alter table public.profiles
  add column if not exists public_handle text,
  add column if not exists is_public boolean not null default false,
  add column if not exists public_show_scores boolean not null default true,
  add column if not exists notifications_seen_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_public_handle_format
    check (public_handle is null or public_handle ~ '^[a-z0-9_]{3,24}$');
exception when duplicate_object then null; end $$;
create unique index if not exists profiles_public_handle_key on public.profiles (public_handle) where public_handle is not null;

-- ───────────── Interviews: candidate's rating of the experience ─────────────
alter table public.mock_interviews
  add column if not exists user_rating smallint check (user_rating between 1 and 5),
  add column if not exists rating_note text check (char_length(rating_note) <= 500);

-- ───────────── Hardening: scores are written by the server only ─────────────
-- Users keep full read access to their own rows (RLS), but can no longer set an interview's status,
-- report or score, or insert judge submissions, directly through the Data API. The app writes those
-- with the service role after its own ownership checks.
revoke insert, update on public.mock_interviews from authenticated;
grant insert (user_id, kind, difficulty, persona, mode, input_mode, company, language, duration_min, resume_id, problem_slug, phase, workspace)
  on public.mock_interviews to authenticated;
grant update (phase, workspace, user_rating, rating_note) on public.mock_interviews to authenticated;

revoke insert, update on public.submissions from authenticated;

-- ───────────── Public profile: one safe, aggregated read for anonymous visitors ─────────────
-- Returns nothing unless the owner opted in. Only activity metadata needed to compute XP/rank/badges:
-- no transcripts, no resume, no code, no email.
create or replace function public.public_profile(handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.id is null then null else jsonb_build_object(
    'handle', p.public_handle,
    'name', split_part(coalesce(nullif(p.full_name, ''), p.public_handle), ' ', 1),
    'role', p.target_role,
    'since', p.created_at,
    'showScores', p.public_show_scores,
    'interviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', m.kind, 'difficulty', m.difficulty,
        'overall', m.overall_score, 'answers', (m.report->'communication'->>'answers')::int,
        'endedAt', coalesce(m.ended_at, m.started_at), 'verdict', m.report->'verdict'->>'level') order by m.ended_at)
      from public.mock_interviews m where m.user_id = p.id and m.status = 'completed'), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.problem_slug, 'status', s.status, 'hintsUsed', s.hints_used,
        'createdAt', s.created_at, 'language', s.language, 'solveSeconds', s.solve_seconds) order by s.created_at)
      from public.submissions s where s.user_id = p.id), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('doneAt', t.done_at) order by t.done_at)
      from public.study_tasks t where t.user_id = p.id and t.done_at is not null), '[]'::jsonb)
  ) end
  from (select 1) one
  left join public.profiles p on p.public_handle = lower(handle) and p.is_public;
$$;

revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated, service_role;

-- Defence in depth: API roles never need TRUNCATE (which bypasses RLS), REFERENCES or TRIGGER.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
