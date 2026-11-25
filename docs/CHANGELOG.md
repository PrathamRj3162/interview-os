# Changelog

## 0.7.0 — 2026-11-25 · Voice v2
- On-device voice activity detection (`lib/voice/vad.ts`): adaptive noise floor, hysteresis, ignores clicks; a stricter mode while the interviewer talks so speaker echo doesn't count.
- Auto-send after you stop talking, with a visible 1.5 s countdown you can cancel by talking or pressing "Don't send"; adjustable pause length (0.8–3 s).
- Barge-in: while the interviewer speaks the mic only monitors (nothing recorded or transcribed); speaking up stops the voice and starts listening.
- Interviewer speech is streamed sentence by sentence (`lib/voice/sentences.ts`), so it starts sooner and stops cleanly.
- Optional natural voice: Kokoro-82M running entirely in the browser (module worker, WebGPU when available, otherwise WASM; ~90 MB one-time download), with automatic fallback to the browser voice.
- Optional Whisper speech-to-text via Groq's free tier, only when `GROQ_API_KEY` is configured (`/api/voice/stt`; counts toward the daily AI limit). Otherwise the engine is shown as unavailable, not hidden.
- Latency readout in the room (speech-to-text, interviewer reply, time to first spoken word), measured on the device.
- Mic check page: device picker, live level and noise floor with advice, pause detection indicator, 5 s record and playback (stays in the tab), recognition test, both voices with timing.
- Fix: dialogs now get unique title ids, so a second dialog on the page announces the right name.

## 0.6.0 — 2026-11-25 · Progress, tiers and achievements
- XP computed on the fly from recorded activity (no stored, editable XP number), `lib/progress/xp.ts`: interview = score × difficulty multiplier (needs 3+ answers); problems Easy 20 / Medium 40 / Hard 80 on the first accepted solve, ×0.5 with 2+ hints, +10 for a first-try accept; tasks +10 (max 30/day); streak +5 × min(streak, 10) per active day. Days use IST.
- Levels at 150·k^1.6 XP; 7 tiers (Intern → Junior → SDE-1 → SDE-2 → Senior → Staff → Principal) × divisions III–I, with original hexagon emblems and taglines (Gen-Z or neutral, following the Vibe setting).
- Decay: −1%/day after 7 inactive days, never below the tier floor; shown honestly with the amount.
- 18 achievements with the date each was earned and progress bars for locked ones; personal bests (best score per round, fastest solve per difficulty, longest streak, best day); weekly recap vs the previous week; 30-day XP chart; recent XP ledger with the reason for every point.
- Mistake notebook: concepts missed across reports (counted), every important mistake linked to its report, and problems attempted but not yet solved (with Retry).
- Dashboard rank strip; report header shows the XP an interview earned; one-time level/rank/achievement celebration on the progress page (respects reduced motion).

## 0.5.0 — 2026-11-25 · Report v2: evidence-based verdict
- Anchored 1–4 rubric: every category of every round has written meanings for 1, 2, 3 and 4 (`lib/interview/rubric.ts`); the report shows what your score means and what each level requires. Core categories per round count double.
- Deterministic verdict (`lib/interview/verdict.ts`): weighted mean → No Hire / Lean No / Lean Hire / Hire / Strong Hire at fixed thresholds, then caps that only lower it (a 1 in a core category, any 1, failing or too-slow code, unverified code, 2–3 hints). Every step is shown. Too little evidence (under 3 answers, under half the categories scored, no core category) gives no verdict instead of a guess. The AI never picks the verdict.
- Coding rounds: Correctness is scored from the judge, not the AI.
- Evidence quotes carry the time you said them (mm:ss), and are still discarded if they aren't in your transcript.
- Objective metrics computed from timestamps (`lib/interview/metrics.ts`): duration, talk share, median reply time, questions asked; for coding, first run, first submit, accepted-at, runs before acceptance.
- The one thing to fix (your lowest-scored category, ties broken by core weight) with a concrete action; 3 drills, which become your study-plan tasks.
- Annotated final code: the evaluator must quote the line it comments on; notes whose quote isn't in your code are discarded.
- "Practise next": two related problems (same topics, one step harder, unsolved) that open the setup with the problem pre-selected; "Retry this problem".
- Interview list shows the verdict. Older (v1, 1–5) reports still display as they were, without a retro-fitted verdict, and score deltas only compare reports on the same scale.

## 0.4.1 — 2026-11-25 · DSA round: lists, trees, slow-solution detection
- Linked lists and binary trees: new `ListNode` / `TreeNode` value types in all four harnesses (JSON arrays in, real nodes for the solution, arrays out; cycle-safe), node classes predefined and shown above the starter. 20 new problems (79 total).
- Timed stress tests: 22 problems end Submit with one large worst-case input. Each call is timed inside the harness; a correct but slow answer is "Too slow" (status `time_limit`) with an explanation, and a judge timeout that only the stress input missed is reported as a complexity problem. Calibrated on Judge0 CE (brute force flagged in all four languages; optimal 0.4–370 ms vs 1–5 s budgets).
- Python Run never waits for Pyodide: it starts downloading on the setup page, Run falls back to the judge until it's ready, a "Py loading / Py ready" indicator shows the state, and the worker reloads immediately after a timeout.
- User guide (PDF) has a new chapter on the DSA round.

## 0.4.0 — 2026-11-25 · DSA live-coding round
- New "DSA & live coding" round: resizable problem | editor | interviewer layout (tabs on mobile), focus mode by default.
- CodeMirror 6 editor for Python, JavaScript, C++ and Java: starter code per signature, per-language autosave (browser + server), reset, Ctrl/⌘+' Run, Ctrl/⌘+Shift+Enter Submit.
- 59 problems with original statements, typed signatures, 3 graded hints each, and seeded hidden tests whose expected outputs come from reference solutions.
- Code execution: Python (Pyodide) and JavaScript run the examples in a browser Web Worker; C++/Java runs and every Submit use Judge0 (public CE by default, `JUDGE0_URL` for self-hosted). One process runs all tests, per-test verdicts, first failing hidden test revealed, compiler/runtime line numbers mapped to your code.
- Code-aware interviewer: sees your code, the diff since your last message, run/submit results, pastes, idle stretches, language switches and hints.
- Server-side phase machine: intro → clarify → brute force → optimise → code → test → complexity → wrap-up (deterministic signals + the model's suggestion; forward only).
- Practice mode: 3 pre-written graded hints per problem (no AI call), logged. Mock mode: no hints.
- Report: objective coding facts (judge result, runs, hints, pastes, phases reached, optimal approach, final code).
- Migration 0004 (interview_events with append-only RLS, phase/problem/workspace columns, submission results); per-user judge limit (`JUDGE_DAILY_LIMIT`, default 80/day) and a 4 s cooldown.

## 0.3.0 — 2026-11-25 · Neon-retro redesign
- Design tokens (Neon / High contrast), component kit and /design page; new landing; grouped "coming soon" sidebar; 3-step interview setup; focus mode and keyboard shortcuts in the room; skeleton/error states; WCAG AA contrast test; Lighthouse 97/100/100.

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
