-- 0009 · Transcripts are written only by the server.
-- Interview turns feed the AI evaluation, the verdict, XP and public stats, so users may read their own
-- turns but can no longer insert, edit or delete them through the Data API. The turn route writes them
-- with the service role after checking the interview belongs to the user. (Deleting an interview or the
-- account still removes its turns via ON DELETE CASCADE.)
revoke insert, update, delete on public.interview_turns from authenticated;
grant select on public.interview_turns to authenticated;

-- The proactive interviewer logs a "nudge" event (rate-limited to one every 2 minutes).
alter table public.interview_events drop constraint if exists interview_events_type_check;
alter table public.interview_events add constraint interview_events_type_check
  check (type in ('run','remote_run','submit','paste','idle','language','hint','phase','reset','nudge'));
