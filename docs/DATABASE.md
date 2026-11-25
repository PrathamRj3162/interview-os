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
