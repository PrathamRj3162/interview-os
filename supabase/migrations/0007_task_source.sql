-- 0007 · Only platform-created tasks (from interview reports and the planner) earn XP.
-- Users can still add, edit, complete and delete their own tasks, but can't mark a task as platform-made.
alter table public.study_tasks
  add column if not exists source text not null default 'user' check (source in ('user', 'planner', 'report'));

-- Backfill: report tasks carry a "From your … mock interview" reason; planner tasks link into the app.
update public.study_tasks set source = 'report' where source = 'user' and reason like 'From your %mock interview%';
update public.study_tasks set source = 'planner' where source = 'user' and coalesce(reason, '') <> 'Added by you.' and reason is not null and reason not like 'From your %';

revoke insert, update on public.study_tasks from authenticated;
grant insert (plan_id, user_id, due_date, kind, title, link, reason, minutes) on public.study_tasks to authenticated;
grant update (done_at, title, due_date, minutes) on public.study_tasks to authenticated;

-- The public profile counts only platform-created tasks (the same rule as XP).
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
      from public.study_tasks t where t.user_id = p.id and t.done_at is not null and t.source <> 'user'), '[]'::jsonb)
  ) end
  from (select 1) one
  left join public.profiles p on p.public_handle = lower(handle) and p.is_public;
$$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated, service_role;
