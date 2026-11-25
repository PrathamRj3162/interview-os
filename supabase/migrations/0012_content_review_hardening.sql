-- 0012 · Review gate hardening.
-- 1. Users may read only the status columns of content_reviews (not which admin reviewed an item).
revoke select on public.content_reviews from authenticated;
grant select (item_id, version, status, updated_at) on public.content_reviews to authenticated;

-- 2. Throwaway accounts can't hide content: only reports from confirmed accounts at least 7 days old count
--    toward the 3-reporter auto-hide. Every report still appears on /review for an admin.
create or replace function public.content_hidden_items() returns table (item_id text, version int)
language sql stable security definer set search_path = '' as $$
  select r.item_id, r.version
  from public.content_reports r
  join auth.users u on u.id = r.user_id
  where r.resolved_at is null
    and u.email_confirmed_at is not null
    and u.created_at <= now() - interval '7 days'
  group by r.item_id, r.version
  having count(distinct r.user_id) >= 3
$$;
revoke all on function public.content_hidden_items() from public;
grant execute on function public.content_hidden_items() to authenticated, service_role;
