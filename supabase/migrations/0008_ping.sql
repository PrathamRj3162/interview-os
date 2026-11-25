-- 0008 · A trivial, harmless query for health checks, latency measurement and the keep-alive cron
-- (free Supabase projects pause after a week without database activity).
create or replace function public.ping() returns timestamptz language sql stable set search_path = '' as $$ select now() $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated, service_role;
