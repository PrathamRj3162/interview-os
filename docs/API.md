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
