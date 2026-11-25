# Security

- Auth: Supabase Auth, cookie sessions via `@supabase/ssr`; proxy verifies JWT (`getClaims`), pages/actions use `getUser()`.
- Authorization: RLS on every user table and storage objects; service-role key server-only, used only for account deletion.
- Input: zod on every action; DB CHECK constraints on enums and sizes; `safeNext()` blocks open redirects.
- Headers: nosniff, X-Frame-Options DENY, HSTS, strict referrer, Permissions-Policy (mic self only).
- AI: keys server-only; untrusted content delimited; outputs schema-validated; no prompt/response bodies logged.
- Code execution (Phase 3): never on the server; sandboxed iframe without `allow-same-origin` + worker with timeouts.
- Data: account deletion removes rows (cascade) and storage files. No audio stored.
- Voice: level metering and pause detection run on the device (Web Audio). With browser recognition, audio goes to the browser's speech service (Google in Chrome). With Whisper (only if `GROQ_API_KEY` is set and the user picks it), each answer's audio is posted to `/api/voice/stt` (auth, 4 MB cap, type check, daily AI quota) and forwarded to Groq; it is never stored. The optional natural voice (Kokoro) runs in a browser worker: the library loads from jsDelivr and the model from Hugging Face; text never leaves the device. Mic-check recordings stay in the tab.

## Running candidate code (DSA round)

- **Browser (Python/JS Run):** code runs in a dedicated Web Worker created from a Blob — no DOM, no access to the app's state. Runs are time-limited (JS 5 s, Python 10 s); an overrunning worker is terminated. Pyodide loads from jsDelivr.
- **Judge0 (C++/Java Run, every Submit):** executed in Judge0's sandbox, never on our servers. Defaults to the public CE instance, so code leaves the platform — the room says so. Per-user daily cap (`JUDGE_DAILY_LIMIT`) and a 4 s cooldown protect the shared free service.
- Result markers carry a per-run random nonce and the last marker per test wins, so printing fake results doesn't pass tests. Browser-run results are reported by the client and labelled as such; only server-side Submit counts as a submission.
- Hidden tests are never sent to the browser; only the first failing hidden case is revealed after a Submit.
- Candidate code, diffs and events reach the interviewer model inside `<untrusted>` blocks.
