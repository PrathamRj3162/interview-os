# Testing

```
npm test          # vitest unit tests (tests/)
npm run typecheck
npm run lint
npm run build
```
Current: validation schemas, open-redirect guard, AI JSON extraction + injection delimiter, readiness metrics.
Manual smoke (no DB configured): public pages 200, protected pages 307 → /login, unknown route 404, no server errors.
Planned: Playwright E2E of the full candidate journey once a Supabase test project exists.

## DSA round

- `tests/dsa-bank.test.ts` — every problem has 3 hints and a reference; every statement example agrees with the reference; hidden tests are deterministic; **every reference solution passes all tests through the real JavaScript harness** (program generation → node → output parsing → grading).
- `tests/dsa-harness.test.ts` — hand-written Python/C++/Java/JS solutions covering every value type (including linked lists and trees) pass through their harnesses using local toolchains (Java runs in CI; skipped if a toolchain is missing); starter code compiles for every signature; per-test exceptions, spoofed result markers, compile errors, hidden-test redaction and line-number mapping.
- `tests/learn.test.ts` — SM-2 intervals/ease, planner budget/determinism/dedupe/deadline, pattern tags exist in the bank, fundamentals bank integrity, GitHub URL parsing and dependency ranking.
- `tests/voice.test.ts` — VAD start/end timing, click and steady-noise rejection, pauses inside an answer, strict (barge-in) mode; TTS sentence chunking (markdown/code stripping, abbreviations, long-sentence wrapping, hints).
- `tests/progress.test.ts` — XP formula (interview multiplier, 3-answer rule, first-solve only, hint halving, first-try bonus, task cap, streak bonus), levels and the 21 ranks, IST day boundaries, decay and the tier floor, dated achievements, bests, weekly recap, daily series.
- `tests/report-v2.test.ts` — every rubric category has 4 anchors; verdict thresholds, core weighting, every cap, determinism and the not-enough-evidence rule; one-thing selection; metrics from timestamps; timestamped quote lookup; code-note validation; v1 report display.
- `tests/dsa-stress.test.ts` — timing markers, stress-test grading (fast pass, correct-but-too-slow, judge timeout with partial output, wrong answer outranks timeout, browser runs never time-fail).
- `e2e/learn.spec.ts` — DSA academy filters and pages, pattern studied state, a quiz graded server-side (answer key absent from the page) turning misses into cards, an SM-2 review, the planner within budget, the system design lab's focused practice, and a real public-repo analysis.
- `e2e/gaps.spec.ts` — opt-in public profile (404 by default, reserved handles rejected, visible logged-out without email, noindex, 404 again when turned off); forged writes with a real user session are denied (fake accepted submission, completed interview with a report, setting a score) while rating is allowed; notification bell; company styles page and pre-filled setup; interviewer characters and suggested difficulty. `core-loop` also checks the paste flag, next-step links and the emoji rating.
- `e2e/voice.spec.ts` — Chromium fake microphone fed a generated speech-like WAV: mic check opens the device, measures the noise floor, the VAD hears speech, record and playback; the voice room's settings dialog shows honest engine availability and settings persist across reloads.
- `e2e/dsa.spec.ts` — full round on the mock AI: setup with a chosen problem, failing then passing browser Run, graded hint, phase change, Submit through the public Judge0, autosave across reload, report with judge facts, then XP/rank/achievement on the progress page and the dashboard; plus Python Run (judge fallback while Pyodide loads, then in-browser), Python syntax-error line mapping, language switch and a C++ Judge0 run.
