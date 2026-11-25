# Security

- Auth: Supabase Auth, cookie sessions via `@supabase/ssr`; proxy verifies JWT (`getClaims`), pages/actions use `getUser()`.
- Authorization: RLS on every user table and storage objects; service-role key server-only, used only for account deletion.
- Input: zod on every action; DB CHECK constraints on enums and sizes; `safeNext()` blocks open redirects.
- Headers: nosniff, X-Frame-Options DENY, HSTS, strict referrer, Permissions-Policy (mic self only).
- AI: keys server-only; untrusted content delimited; outputs schema-validated; no prompt/response bodies logged.
- Code execution (Phase 3): never on the server; sandboxed iframe without `allow-same-origin` + worker with timeouts.
- Data: account deletion removes rows (cascade) and storage files. No audio stored.
