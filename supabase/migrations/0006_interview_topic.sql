-- 0006 · Focused practice: an interview can target a design topic (system design lab) or one project.
alter table public.mock_interviews
  add column if not exists topic text check (char_length(topic) <= 200),
  add column if not exists project_id uuid references public.projects(id) on delete set null;
grant insert (topic, project_id) on public.mock_interviews to authenticated;

-- Project analysis is written by the server (it calls GitHub and the AI); users may still edit their own text fields.
revoke update on public.projects from authenticated;
grant update (title, description, technologies, repo_url) on public.projects to authenticated;
