# API

Mutations are Next.js Server Actions (POST, same-origin, CSRF-protected by Next's origin check).

| Action | File | Input | Notes |
|---|---|---|---|
| signIn / signUp / signOut | app/actions/auth.ts | email, password, full_name | Uniform errors (no account enumeration) |
| requestPasswordReset / updatePassword | app/actions/auth.ts | email / password+confirm | Reset always returns the same message |
| saveProfile | app/actions/profile.ts | profile form | zod `profileSchema` |
| setAiConsent | app/actions/profile.ts | checkbox | Gates sending resume text to AI |
| setPublicProfile | app/actions/profile.ts | is_public, public_handle, public_show_scores | Opt-in public page at `/u/:handle`; reserved and taken handles rejected |
| rateInterview | app/actions/interview.ts | id, rating 1–5, note? | Emoji rating of your own interview |
| markProgress | app/actions/learn.ts | itemType, slug, done | Lessons and design cases studied (`user_progress`) |
| gradeQuiz | app/actions/learn.ts | topic, ids, a_<id> | Server-side grading; misses → flashcards |
| reviewCard / addCard / deleteCard / cardsFromReports | app/actions/learn.ts | — | SM-2 review and deck management |
| generateWeek / addTask / deleteTask / toggleTask | app/actions/tasks.ts | — | Planner; tasks are your own rows (RLS) |
| addProject / analyseProject / deleteProject | app/actions/projects.ts | title, repo_url… | Public GitHub only; analysis written with the service role |
| reportProblem | app/actions/content.ts | itemId, version, reason, note? | Any user; one open report per item version |
| setContentStatus / resolveReports | app/actions/content.ts | itemId, version, status | Admin only (`ADMIN_EMAILS`); failing checks can't go live |
| deleteAccount | app/actions/profile.ts | confirm="DELETE" | Service role; deletes user (cascade) then storage |

Routes: `GET /api/health` → `{ ok, database, ai: [providerIds], region }`; `?db=1` adds `roundTripsMs` from three `ping()` calls. `POST /api/csp-report` collects CSP violation reports (logged, no body stored). `GET /auth/callback` → email confirm / recovery.

## Interview routes (JSON, session cookie, RLS-scoped)

| Route | Body | Notes |
|---|---|---|
| `POST /api/interview/:id/turn` | `{action:"start"}` · `{action:"answer", content, code?, language?, pasted?}` · `{action:"hint"}` · `{action:"nudge", reason:"idle"\|"failed_run"\|"paste"}` | One interviewer turn, streamed as SSE: `delta` (text), then `done` (`{turn, phase, timing}`) or `error`. Live AI budget 8 s/attempt, 15 s total. DSA: deterministic opening and graded hints (no AI). `nudge` (DSA only) is limited to one per 2 minutes and counts toward the AI limit; mock mode asks a question, never a hint. Turns are written with the service role. |
| `POST /api/interview/:id/run` | `{language, code, mode:"run"\|"submit"}` | Judge0 execution. `run` = examples, `submit` = examples + hidden tests (saved to `submissions`). Judge limit + cooldown → 429. |
| `POST /api/interview/:id/events` | `{events:[{type,payload}], workspace?:{language, code}}` | Room telemetry (browser run summary, paste, idle, language, reset) + server autosave. zod per event type. |
| `POST /api/interview/:id/summary` | — | 3-sentence spoken feedback right after ending (live AI budget). |
| `POST /api/interview/:id/complete` | — | Idempotent report generation (status lock, service role). With `Accept: text/event-stream` it streams `stage` events then `done`. Falls back to a chunked evaluation if the one-shot call fails. DSA facts, metrics, verdict and paste flags are computed in code. |
| `POST /api/voice/stt` | multipart `audio` (≤4 MB) | Whisper via Groq, only when `GROQ_API_KEY` is set (503 otherwise); counts toward the daily AI limit. |
| `GET /api/notifications` · `POST` | — | Derived in-app notifications with unread state; POST marks all read. |
