-- 0010 · Content review gate and "report a problem".
-- Static content (problems, cases, primers, questions…) lives in the repo with a default status. An admin can
-- move a specific VERSION of an item to draft / reviewed / live; editing an item bumps its version, so it needs
-- review again. Only the server (service role) writes reviews, after checking ADMIN_EMAILS.
create table if not exists public.content_reviews (
  item_id text not null check (char_length(item_id) between 3 and 120),
  version int not null check (version >= 1),
  status text not null check (status in ('draft','reviewed','live')),
  reviewed_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  primary key (item_id, version)
);
alter table public.content_reviews enable row level security;
create policy "content_reviews readable by signed-in users" on public.content_reviews for select to authenticated using (true);
revoke all on public.content_reviews from anon, authenticated;
grant select on public.content_reviews to authenticated;
grant all on public.content_reviews to service_role;

-- One open report per user per item version. Items with 3+ open reports from different users are hidden
-- automatically until an admin resolves them.
create table if not exists public.content_reports (
  id bigint generated always as identity primary key,
  item_id text not null check (char_length(item_id) between 3 and 120),
  version int not null check (version >= 1),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null check (reason in ('wrong','unclear','typo','copied','other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists content_reports_one_open on public.content_reports (item_id, version, user_id) where resolved_at is null;
alter table public.content_reports enable row level security;
create policy "report as yourself" on public.content_reports for insert to authenticated with check (user_id = auth.uid());
create policy "see your own reports" on public.content_reports for select to authenticated using (user_id = auth.uid());
revoke all on public.content_reports from anon, authenticated;
grant insert (item_id, version, reason, note) on public.content_reports to authenticated;
grant select on public.content_reports to authenticated;
grant all on public.content_reports to service_role;

-- Item versions hidden by reports (no reporter identities exposed).
create or replace function public.content_hidden_items() returns table (item_id text, version int)
language sql stable security definer set search_path = '' as $$
  select r.item_id, r.version from public.content_reports r
  where r.resolved_at is null group by r.item_id, r.version having count(distinct r.user_id) >= 3
$$;
revoke all on function public.content_hidden_items() from public;
grant execute on function public.content_hidden_items() to authenticated, service_role;
