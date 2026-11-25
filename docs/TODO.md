# Roadmap

- [x] Phase 0 — research & architecture
- [x] Phase 1 — foundation, auth, onboarding, dashboard, settings
- [x] Phase 1 verified against live Supabase (Playwright: login, onboarding, dashboard, persistence, settings, deletion)
- [x] Phase 2 — Resume intelligence: upload (PDF/DOCX, magic-byte checks), extraction, transparent rule score, AI claims (verbatim-verified), rewrites, recruiter concerns, tailored standard questions
  - [ ] Resume version comparison, role-specific resume export
- [ ] Phase 3 — DSA academy: curriculum data, problems + tests, Monaco, in-browser JS/Python runner, adaptive next-problem
- [ ] Phase 4 — CS fundamentals: lessons, deterministic quizzes
- [ ] Phase 5 — System design lab: LLD/HLD content, Mermaid, guided simulator
- [ ] Phase 6 — Project deep-dive + public GitHub repo analysis
- [x] Phase 7 — Mock interview studio: 9 personas × 10 rounds × 5 difficulties, mock vs practice (hints), turn-based browser voice (STT+TTS, barge-in, mute, pause), text fallback, code panel, idempotent evidence-verified report, tasks into study plan
  - [x] DSA live-coding round: CodeMirror 6, 59 problems, browser runners (Pyodide/JS) + Judge0, code-aware interviewer, phase machine, graded hints (v0.4.0)
  - [ ] Report v2: anchored 1–4 rubric, objective metrics, timestamped quotes, deterministic verdict, drills, annotated code
  - [ ] Progress: tiers/XP/achievements, charts, mistake notebook
  - [ ] Voice v2: VAD, Whisper (Groq) / Kokoro TTS, streaming, latency display
  - [ ] Linked-list / tree problems (need extra harness types)
- [ ] Phase 8 — Planner, analytics, revision (SM-2 flashcards, mistake notebook)
- [ ] Phase 9 — Playwright E2E, security pass
- [~] Phase 10 — Vercel project `interview-os` created, env configured, production build live behind Vercel auth; pending: migrations 0002/0003, public access, Supabase URL config, SMTP, keep-alive job
