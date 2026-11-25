# Database

Schema: `supabase/migrations/0001_init.sql`. Apply it in the Supabase SQL editor (or `supabase db push`).

- `profiles` (1:1 with `auth.users`, auto-created by trigger on signup)
- Resume: `resumes` → `resume_analyses`, `resume_claims`; `projects`
- Practice: `submissions`, `user_progress` (PK user/type/slug), `quiz_attempts`
- Interviews: `mock_interviews` → `interview_turns`
- Planning: `study_plans` → `study_tasks` (each task stores a `reason`)
- Revision: `notes`, `bookmarks`, `flashcards` (SM-2 fields)
- `ai_usage` (append-only from the client's perspective)

Every user table: `user_id → auth.users on delete cascade`, RLS policy `user_id = auth.uid()`. `anon` has no table access.
Storage: private bucket `resumes`, 5 MB, PDF/DOCX only, objects must be under `<uid>/`.
Static content (problems, lessons, quizzes) is referenced by `slug` and lives in the repo.

## 0004 — DSA round

- `mock_interviews.problem_slug` (bank slug), `phase` (intro…wrap), `workspace` jsonb `{language, code, codeAtLastTurn, updatedAt}` (size-capped).
- `submissions.interview_id`, `submissions.results` (summary only: status, counts, first failure).
- `interview_events` — append-only room log (`run`, `remote_run`, `submit`, `paste`, `idle`, `language`, `hint`, `phase`, `reset`). RLS: users can read and insert their own rows, and only into their own interviews; no update/delete.
- Problems, hints and hidden tests are **not** stored in the database: they live in `src/lib/dsa` and hidden-test expectations are computed from reference solutions with a seeded generator.

## 0005 — Public profiles, ratings, hardening
- `profiles`: `public_handle` (unique, `^[a-z0-9_]{3,24}$`), `is_public` (default false), `public_show_scores`, `notifications_seen_at`.
- `mock_interviews`: `user_rating` (1–5), `rating_note` (≤500).
- **Server-only writes.** `authenticated` may insert only the setup columns of `mock_interviews` and update only `phase`, `workspace`, `user_rating`, `rating_note`; it can no longer insert/update `submissions`. Status, report, score and judge submissions are written by the service role inside the app, always scoped by `user_id`. TRUNCATE/REFERENCES/TRIGGER revoked from API roles.
- `public_profile(handle)` — `security definer`, returns JSON only when the owner opted in: first name, role, join date and the activity metadata the XP engine needs (no transcripts, resume, code or email). Executable by `anon`.

## 0006 — Focused practice
- `mock_interviews.topic` (≤200 chars, e.g. a system design case) and `project_id` (FK → projects, on delete set null); both insertable by the user.
- `projects`: users may update only `title`, `description`, `technologies`, `repo_url`; `repo_snapshot` and `analysis` are written by the server.

