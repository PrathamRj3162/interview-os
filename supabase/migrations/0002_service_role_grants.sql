-- Newer Supabase projects don't auto-grant public-schema tables to API roles.
-- 0001 granted `authenticated`; server-side admin work (service_role) needs its own grants.
-- service_role bypasses RLS by design and is only ever used server-side.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
