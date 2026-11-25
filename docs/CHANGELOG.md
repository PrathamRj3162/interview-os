# Changelog

## 0.2.0 — 2026-11-25 · Resume intelligence + mock interviews
- Resume upload (PDF/DOCX ≤5 MB, content-sniffed), private storage, signed downloads, deletion.
- Deterministic resume score with per-check explanation; unsupported-skill and missing-keyword detection.
- AI claim analysis with verbatim-quote verification; bullet rewrites that use placeholders instead of invented numbers.
- Mock interview studio: personas, rounds, difficulties, practice/mock modes, browser voice, code panel.
- Evaluation: rubric per round, evidence quotes verified against transcript, deterministic overall score, per-question feedback, communication stats, priorities → study tasks.
- Dashboard: today's tasks, data-driven next step, resume score, recent interviews.
- Fixes: forms kept user input after errors; specific rate-limit messages; per-provider model fallback (Gemini overloaded → lite).
- Migrations 0002 (service_role grants), 0003 (interview mode/input_mode, evaluating states).

## 0.1.0 — 2026-11-25 · Phase 0 + Phase 1
- Architecture decisions, risk register, full schema with RLS and private storage.
- Auth: sign up, sign in, sign out, email confirmation, password reset.
- Onboarding → preparation profile; editable in Settings.
- Dashboard backed by real data (empty states, no fabricated scores).
- Privacy: AI resume consent toggle; account + file deletion.
- AI provider adapter (Gemini/Groq/OpenRouter-free/Ollama) with fallback, JSON validation, quotas.
- Landing, Privacy Policy, Terms, health endpoint, security headers.
