# Changelog

## 0.11.0 — 2026-11-28 · System design v2 (Phase A of the hiring-standard plan)
**Content gate (every phase from now on)**
- One content schema (id, version, type, difficulty, tags, status draft|reviewed|live). Only live items reach users; admins (`ADMIN_EMAILS`, confirmed email) see everything else marked Preview. `/review` shows each item's automated checks (the same ones CI runs), open reports and status controls; failing checks can't go live; an edit bumps the version and needs review again (migrations 0010, 0012).
- "Report a problem" on content. Reports from three confirmed accounts at least 7 days old hide an item until an admin resolves them, so throwaway accounts can't take content down.

**The round**
- Excalidraw whiteboard in HLD and LLD rooms, read by the interviewer: each answer carries the board as compact text (boxes → nodes, labelled arrows → edges, stable `[n:…]`/`[e:…]` ids), stored server-side with the turn (migration 0011). Autosaved for reloads. Fonts are self-hosted so the CSP stays strict. The answer box sits inside the whiteboard panel.
- Time-boxed phases driven by the server: requirements 5 → estimates 5 → API & data 5 → high-level 10 → deep dive 15 → curveball 5 → wrap-up (scaled to the round length). The interviewer acts as PM (numbers only when asked), is told to steer on after an overrun, and introduces one scheduled curveball per round (migration 0013: `design_case`, design phases).
- HLD rubric v2: requirements, estimation, API & data model, architecture (core), deep dive (core), scaling & reliability, trade-offs, operations, communication — each with SDE-1 and SDE-2+ anchor sets chosen by difficulty.
- Report: checklist coverage score (an item counts only with a verified quote or a whiteboard element the candidate actually drew; no score is shown if the coverage step failed), red flags computed in code (components before requirements, no numbers, technology without a reason), curveball, phases reached and the final board. Score deltas only compare reports on the same rubric.

**The lab**
- 24 cases (12 new, shipped as draft: unique IDs, KV store, message queue, job scheduler, typeahead, web crawler, Instagram, collaborative editor, YouTube, UPI-style payments, flash sale, food delivery). Every case has SDE-1/SDE-2 variants, a weighted must-cover checklist, 3 curveballs, 5 common mistakes and a reference diagram; the reference unlocks after an attempt.
- 25 building-block primers with a 30-second answer and three server-graded check questions.
- Estimation trainer: seeded drills graded in code with worked steps, plus a latency/powers-of-two card.
- Design fundamentals drill: 5 scenario questions in 15 minutes, graded on key points that must be quoted from your answer; misses become revision cards.

## 0.10.0 — 2026-11-25 · Live feel, integrity, and a 206-problem bank
**Live interviews**
- Interviewer replies stream over SSE (`delta` events, then `done` with metadata and timing); speech starts at the first finished sentence.
- Live AI budget for turns: fast providers first (Groq gpt-oss with low reasoning effort), 8 s per attempt, 15 s total, then an honest error instead of a long hang.
- Database calls in a turn run in parallel batches, and the app now runs in Vercel's Mumbai region (`bom1`) next to Supabase (ap-south-1). Measured database round trip: 230–690 ms from `iad1` → 17–55 ms from `bom1` (`/api/health?db=1`).
- Proactive interviewer in DSA rounds: after 90 s without editor activity, a failed Run/Submit, or a large paste, the interviewer checks in. Mock mode asks a probing question, never a hint; at most one nudge per 2 minutes; nudges count toward the daily AI limit.
- Voice: Silero VAD (model-based pause detection, runs on the device) with the energy VAD as fallback, plus a noisy-room setting. Speech-to-text can now run on the device (Whisper tiny.en on CPU, base.en with WebGPU) in addition to the browser and the optional Groq Whisper. Kokoro always uses the smaller q8 model.
- Instant feedback: when you end, a 3-sentence spoken summary arrives first, while the full report is built in the background with real progress stages. If the one-shot evaluation fails, a chunked evaluation (two categories per call) runs instead; a category that still fails stays unscored.

**Integrity and security**
- Interview transcripts (`interview_turns`) are server-only writes (migration 0009). Covered by an E2E test that tries a forged write with a real session.
- Content-Security-Policy with per-request nonces, first report-only and now enforced (no violations seen). The JS runner uses a blob worker per run instead of `new Function`, and zod runs in jitless mode, so `unsafe-eval` isn't needed. Violations go to `/api/csp-report`.
- Task XP counts only for platform-created tasks (migration 0007 `study_tasks.source`), so typing your own tasks can't farm XP.
- Keep-alive: a GitHub Action calls a harmless `ping()` RPC (migration 0008) every 3 days so the free Supabase project isn't paused.
- GitHub repo analysis uses 3 API calls plus raw file reads, a 24 h shared cache, and a clear message when GitHub's free limit is hit.

**Content**
- Problem bank: 79 → 206 problems (56 Easy / 110 Medium / 40 Hard), written for Interview OS. New topics include queue, trie, bit manipulation, union-find, prefix sums, math, knapsack/DP variants, heaps and topological sort. Each problem has hints, approach notes, a reference solution, seeded hidden tests, and (where brute force is a factor of n slower) a timed stress test. New validators for problems with several valid answers (alien dictionary, sudoku, reorganise string).
- CS fundamentals: 60 → 100 questions. Quiz options are shown in a random order, so answers can't be guessed by position.
- System design lab: a reference architecture or class diagram for every case, and an in-browser sketchpad (pen, box, eraser, PNG export) saved on your device only.

## 0.9.0 — 2026-11-25 · Learning modules: every sidebar item is live
- DSA academy (`/dsa`): problem browser with topic/difficulty/status filters and search, problem pages with your submission history, 13 original pattern guides linked to bank problems by tag, "mark as studied".
- CS fundamentals (`/fundamentals`): 60 original MCQs across OS, DBMS, networks and OOP; answer key server-only, graded by a server action, stored in `quiz_attempts`; explanations on the result page; every miss becomes a flashcard.
- Revision (`/revision`): SM-2 spaced repetition (`lib/learn/sm2.ts`); review session with Again/Hard/Good/Easy; add your own cards; import missed concepts from interview reports.
- Study planner (`/planner`): deterministic weekly plan (`lib/learn/planner.ts`) from weak report areas, unsolved problems, weakest patterns, quiz accuracy, due cards and round variety, within your daily budget and deadline; overdue list; add/complete/delete tasks.
- System design lab (`/system-design`): HLD and LLD frameworks plus 12 case studies with collapsible reference sections; "Practise this with Nisha" starts a round focused on that case (migration 0006 adds `mock_interviews.topic`).
- Project deep-dive (`/projects`): add projects, read a public GitHub repo through the REST API (metadata, file list, README, up to two manifests — listed on the page), AI summary and likely questions (rules-based fallback without AI), and a deep-dive round focused on that project (`mock_interviews.project_id`). Analysis columns are server-only writes.

## 0.8.0 — 2026-11-25 · Company styles, interviewers, next steps, notifications, public profiles
- Security: interview status/report/score and judge submissions are server-only writes (migration 0005, column grants); users could previously have set them through the Data API with their own session. TRUNCATE/REFERENCES/TRIGGER revoked from API roles. Covered by an E2E test that tries the forged writes with a real user session.
- Company style map for 25 companies with a clear "style practice — not actual company questions" label; it steers the interviewer prompt and favours matching DSA topics. New Company styles page.
- Interviewers are original characters (Meera, Priya, Arjun, Ishaan, Sam, Kavya, Rohan, Nisha, Vikram) with generated SVG avatars and tiers: Warm-up, Standard, Tough, Bar raiser.
- Suggested difficulty per round from your latest verdicts (published rules); report "What next": Retry, Next harder (with a harder related problem for DSA), Different round. Setup accepts `difficulty`, `persona`, `company`, `problem` parameters.
- Emoji rating (1–5 + optional note) on reports.
- Paste detection in typed answers (80+ characters), flagged in the report without affecting scores.
- In-app notifications (bell): reports ready or needing a retry, tasks due, streak at risk, XP decay, new achievements; mark all read. No email or push.
- Opt-in public profile at `/u/:handle`: rank, XP, streak, achievements, solved/interview counts, optional scores; never resume, transcripts, code or email; not indexed.
- Resume checks: bullet length and date consistency/order/validity.

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
