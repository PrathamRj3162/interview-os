# Architecture — Interview OS

## Decisions (Phase 0, 2026-11-25)

| Concern | Choice | Why | Fallback |
|---|---|---|---|
| App framework | Next.js 16 (App Router, TS) | One codebase for UI + server actions + API routes; first-class on Vercel | — |
| Hosting | Vercel Hobby | Free, no card; Vercel CLI already installed locally. Hobby is for non-commercial use — fits a free, ad-free tool | Cloudflare Workers via OpenNext, Netlify |
| DB / Auth / Storage | Supabase Free | Postgres + RLS + auth + private storage in one free project | Neon (DB) + Auth.js |
| AI | Provider adapter over OpenAI-compatible APIs: Gemini → Groq → OpenRouter `:free` → Ollama | All have free tiers without card; adapter means no module is tied to a provider | Rule-based features keep working with AI off |
| Code execution | **In the candidate's browser**: JS in a sandboxed iframe (opaque origin), Python via Pyodide in a Web Worker | Free, unlimited, and untrusted code never touches our server | C++/Java via optional self-hosted Judge0/Piston URL (public Piston became whitelist-only Feb 2026) |
| Editor | Monaco | Industry standard | CodeMirror |
| Diagrams | Mermaid | Text-based, renders client-side | — |

## Principles
1. **AI is optional.** Curriculum, problems, test cases, quizzes and progress are versioned data in the repo + Postgres. AI adds question generation and feedback.
2. **No fabricated numbers.** Metrics are `null` until there is evidence (`src/lib/readiness.ts`).
3. **Untrusted input is data.** Resume/repo/answer text is wrapped with `untrusted()` and every request carries a guard system prompt.
4. **Server-side authority.** Proxy does optimistic redirects; every page/action re-verifies with `getUser()`; RLS is the final gate.

## Layout
```
src/
  proxy.ts                 session refresh + optimistic route guard
  app/(auth)/…             login, signup, forgot/update password
  app/(app)/…              authenticated shell: dashboard, settings, modules
  app/onboarding           first-run profile
  app/actions/*            server actions (zod-validated)
  app/api/health           subsystem status (no secrets)
  lib/ai/                  providers.ts, index.ts (chat, generateObject), quota.ts, json.ts
  lib/supabase/            server/browser/proxy clients
  lib/validation/          zod schemas shared by UI and server
supabase/migrations/       SQL schema + RLS + storage policies
```

## AI service contracts
Each module gets its own service in `src/lib/services/<name>.ts` with a zod output schema, used via `generateObject()` (JSON mode, schema validation, one corrective retry, 45s timeout, provider fallback). Quota: `assertQuota()` before, `recordUsage()` after (default 60 requests/user/day).

## Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Free AI quotas shrink (Gemini free limits have been cut before) | AI features degrade | Multi-provider fallback, per-user quotas, caching generated question banks, AI-free core |
| Supabase free project pauses after ~1 week of no activity | Site down | Scheduled ping (GitHub Action) — Phase 10 |
| Supabase free DB is 500 MB | Growth ceiling | Store resume text not files where possible; cap transcript sizes (DB constraints) |
| No free hosted C++/Java runner | Those languages can't be judged by default | Browser execution for JS/Python; documented self-hosted runner |
| Free AI tiers may train on inputs | Privacy | Explicit resume consent toggle; disclosure in Privacy Policy |
| Browser speech recognition support varies | Voice mode | Feature-detect; text-only fallback always available |
