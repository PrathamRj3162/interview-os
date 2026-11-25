# Roadmap

## Done
- [x] Foundation: auth, onboarding, dashboard, settings, data deletion (v0.1–0.2)
- [x] Resume intelligence: PDF/DOCX upload, explained rule score, verbatim-verified AI claims, rewrites, bullet/date checks (v0.2, v0.8)
- [x] Mock interview studio: 9 interviewers × 10 rounds × 5 difficulties, mock vs practice, voice and text (v0.3)
- [x] DSA live-coding round: CodeMirror 6, four languages, browser runners + Judge0, stress tests, graded hints (v0.4)
- [x] Report v2: anchored rubric, measured metrics, rule-based verdict, drills, annotated code (v0.5)
- [x] Progress: XP, tiers, achievements, bests, mistake notebook (v0.6)
- [x] Voice v2: VAD, auto-send, barge-in, sentence streaming, Kokoro, mic check (v0.7)
- [x] Company styles, interviewer tiers, next steps, notifications, public profiles (v0.8)
- [x] DSA academy, CS fundamentals, revision (SM-2), study planner, system design lab, project deep-dive (v0.9)
- [x] Live feel: streamed replies, live AI budget, Mumbai region, proactive nudges, Silero VAD, on-device Whisper, instant spoken feedback (v0.10)
- [x] Integrity: server-only transcripts, enforced CSP, platform-only task XP, keep-alive job (v0.10)
- [x] Content: 206 problems, 100 fundamentals questions, design diagrams + sketchpad (v0.10)
- [x] Playwright E2E for every module, CI, gitleaks secret scan
- [x] Deployed on Vercel (bom1) + Supabase (ap-south-1), migrations 0001–0009 applied

## In progress — hiring-standard upgrade (approved 2026-11-25)
- [ ] Phase A: system design v2 (content gate ✅, whiteboard, design phases, rubric v2, 24 cases, primers, estimation trainer, design fundamentals)
- [ ] Phase B: machine coding round · [ ] C: CS fundamentals v2 · [ ] D: OA + aptitude · [ ] E: behavioural + loops · [ ] F: DSA extras · [ ] G: AI-assisted coding round
- [ ] After A–G: report debrief upgrade — scorecard format (signal/concern/next-level bar, confidence, level estimate, advance yes/no, what wasn't measured), facts from code incl. complexity check, model answers only from verified content, validated drill links, anti-fluff linter + citation filter, two-pass auditor, 40-interview calibration set + `npm run eval:reports` (targets ≥70% exact, ≥95% within one, ≤10% over-scoring), per-round realism, honest trends + outcome logging. Plan and calibration-set outline go to the owner for approval first.

## Open
- [ ] Resume version comparison and role-specific resume export
- [ ] Email notifications (needs a free SMTP sender; in-app bell only for now)
- [ ] Self-hosted Judge0 (public CE is shared and rate-limited)
- [ ] Interactive system design simulator (diagrams and sketchpad are static/reference today)
- [ ] Adaptive next problem from solve history beyond "same topics, one step harder"

## Known limits
- Free AI tiers can be slow or rate-limited; turns fail honestly after 15 s rather than hanging.
- Browser speech recognition sends audio to the browser vendor; choose on-device Whisper to avoid that.
- Stress tests run on a shared free judge, so only problems where brute force is at least a factor of n slower have one.
