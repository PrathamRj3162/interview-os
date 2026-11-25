-- Additive only: safe on existing data.
-- Practice vs mock mode, an 'evaluating' lock state so a report is generated exactly once,
-- and resume analysis status for the UI.

alter table public.mock_interviews
  add column if not exists mode text not null default 'mock' check (mode in ('mock','practice')),
  add column if not exists input_mode text not null default 'text' check (input_mode in ('text','voice'));

alter table public.mock_interviews drop constraint if exists mock_interviews_status_check;
alter table public.mock_interviews add constraint mock_interviews_status_check
  check (status in ('in_progress','evaluating','completed','abandoned','evaluation_failed'));

alter table public.resume_analyses
  add column if not exists overall_score smallint check (overall_score between 0 and 100);

-- Fast "latest completed interviews" lookups for dashboard/analytics.
create index if not exists mock_interviews_user_status_idx
  on public.mock_interviews(user_id, status, ended_at desc);
