-- 0014 · Machine coding round: a 90-minute build of a multi-file app, then a code review.
alter table public.mock_interviews drop constraint if exists mock_interviews_kind_check;
alter table public.mock_interviews add constraint mock_interviews_kind_check check (kind in
  ('resume_screen','hr','dsa','fundamentals','project','lld','hld','behavioral','full','company','machine_coding'));

-- Which machine coding problem (bank slug, in the repo). Insertable by the user at setup; validated by the server.
alter table public.mock_interviews add column if not exists mc_problem text check (mc_problem is null or mc_problem ~ '^[a-z0-9-]{2,80}$');
grant insert (mc_problem) on public.mock_interviews to authenticated;

-- Build → review → wrap.
alter table public.mock_interviews drop constraint if exists mock_interviews_phase_check;
alter table public.mock_interviews add constraint mock_interviews_phase_check check (phase in (
  'intro','clarify','brute','optimise','code','test','complexity','wrap',
  'requirements','estimates','api','high_level','deep_dive','curveball',
  'build','review'
));

-- The minute-60 snapshot and every hidden-test run are written by the server only (submissions are already
-- server-only since 0005; problem_slug is 'mc:<slug>'). The snapshot lives in its own server-only column so the
-- extensibility diff can't be faked through the user-writable workspace.
alter table public.mock_interviews add column if not exists mc_snapshot jsonb check (mc_snapshot is null or pg_column_size(mc_snapshot) < 200000);
revoke update (mc_snapshot) on public.mock_interviews from authenticated;

alter table public.interview_events drop constraint if exists interview_events_type_check;
alter table public.interview_events add constraint interview_events_type_check
  check (type in ('run','remote_run','submit','paste','idle','language','hint','phase','reset','nudge','extension'));
