# API

Mutations are Next.js Server Actions (POST, same-origin, CSRF-protected by Next's origin check).

| Action | File | Input | Notes |
|---|---|---|---|
| signIn / signUp / signOut | app/actions/auth.ts | email, password, full_name | Uniform errors (no account enumeration) |
| requestPasswordReset / updatePassword | app/actions/auth.ts | email / password+confirm | Reset always returns the same message |
| saveProfile | app/actions/profile.ts | profile form | zod `profileSchema` |
| setAiConsent | app/actions/profile.ts | checkbox | Gates sending resume text to AI |
| deleteAccount | app/actions/profile.ts | confirm="DELETE" | Service role; deletes user (cascade) then storage |

Routes: `GET /api/health` → `{ ok, database, ai: [providerIds] }`. `GET /auth/callback` → email confirm / recovery.

## Interview routes (JSON, session cookie, RLS-scoped)

| Route | Body | Notes |
|---|---|---|
| `POST /api/interview/:id/turn` | `{action:"start"}` · `{action:"answer", content, code?, language?}` · `{action:"hint"}` | One interviewer turn. DSA: deterministic opening and pre-written graded hints (no AI); answers carry the editor code; returns `phase`. |
| `POST /api/interview/:id/run` | `{language, code, mode:"run"\|"submit"}` | Judge0 execution. `run` = examples, `submit` = examples + hidden tests (saved to `submissions`). Judge limit + cooldown → 429. |
| `POST /api/interview/:id/events` | `{events:[{type,payload}], workspace?:{language, code}}` | Room telemetry (browser run summary, paste, idle, language, reset) + server autosave. zod per event type. |
| `POST /api/interview/:id/complete` | — | Idempotent report generation (status lock). DSA facts are computed in code and attached to the report. |
