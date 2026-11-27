-- 0013 · System design round v2: the case being designed, and the design phase machine.
alter table public.mock_interviews add column if not exists design_case text check (design_case is null or design_case ~ '^[a-z0-9-]{2,80}$');
grant insert (design_case) on public.mock_interviews to authenticated;

alter table public.mock_interviews drop constraint if exists mock_interviews_phase_check;
alter table public.mock_interviews add constraint mock_interviews_phase_check check (phase in (
  'intro','clarify','brute','optimise','code','test','complexity','wrap',                    -- DSA round
  'requirements','estimates','api','high_level','deep_dive','curveball'                      -- system design round
));
