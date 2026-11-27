# Testing

```
npm test          # vitest unit tests (tests/)
npm run typecheck
npm run lint
npm run build
```
Manual smoke (no DB configured): public pages 200, protected pages 307 → /login, unknown route 404, no server errors.
E2E: `npm run test:e2e` runs Playwright against a local production build with the mock AI; `E2E_MODELS=1` also downloads and tests Kokoro and on-device Whisper under the CSP.

## DSA round

- `tests/dsa-bank.test.ts` — all 206 problems: every problem has 3 hints and a reference; every statement example agrees with the reference; hidden tests are deterministic; **every reference solution passes all tests through the real JavaScript harness** (program generation → node → output parsing → grading).
- `tests/dsa-harness.test.ts` — hand-written Python/C++/Java/JS solutions covering every value type (including linked lists and trees) pass through their harnesses using local toolchains (Java runs in CI; skipped if a toolchain is missing); starter code compiles for every signature; per-test exceptions, spoofed result markers, compile errors, hidden-test redaction and line-number mapping.
- `tests/content.test.ts` — review gate (visibility, admin preview, version re-review, report hiding, confirmed-email admins), every registered item passes its checks (24 cases, 25 primers, 20 drill questions, estimation templates), key-point quote verification.
- `tests/board.test.ts` — whiteboard → text (bound/unbound arrows, labels, free text, deleted elements, caps, refs).
- `tests/design-phases.test.ts` — design phase plan and scaling, time pushes, early advance, never backwards, curveball determinism.
- `tests/design-report.test.ts` — design evidence (quotes, element ids, element text), weighted coverage with dropped claims, red flags.
- `tests/estimation.test.ts` — 1,000 seeds per template, determinism, number parsing, grading bands.
- `tests/mc-analysis.test.ts` — ZIP round-trip, run-bundle contents, nonce-split outputs (fake markers ignored), file validation, extensibility diff, static facts (Java/Python), completeness/extensibility bands.
- `tests/mc-bank.test.ts` — 15 problems with core + extension tests and stored outputs; in CI every Java reference is recompiled and must reproduce them.
- `e2e/machine-coding.spec.ts` — multi-file Java on the real public Judge0, core-only submit before the reveal, server-clock reveal with snapshot, extension tests, frozen review (save refused), report with measured completeness/extensibility and no concurrency category.
- `tests/live.test.ts` — live AI budget (provider order, per-attempt and total timeouts), `@@META` splitting, spoken-text filter.
- `tests/eval-fallback.test.ts` — chunked evaluation when the one-shot report call fails; failed categories stay unscored.
- `tests/learn.test.ts` — every design case has a valid diagram; quiz option order is a permutation; SM-2 intervals/ease, planner budget/determinism/dedupe/deadline, pattern tags exist in the bank, fundamentals bank integrity (4 topics × 25), GitHub URL parsing and dependency ranking.
- `tests/voice.test.ts` — VAD start/end timing, click and steady-noise rejection, pauses inside an answer, strict (barge-in) mode; TTS sentence chunking (markdown/code stripping, abbreviations, long-sentence wrapping, hints).
- `tests/progress.test.ts` — XP formula (interview multiplier, 3-answer rule, first-solve only, hint halving, first-try bonus, task cap, streak bonus), levels and the 21 ranks, IST day boundaries, decay and the tier floor, dated achievements, bests, weekly recap, daily series.
- `tests/report-v2.test.ts` — every rubric category has 4 anchors; verdict thresholds, core weighting, every cap, determinism and the not-enough-evidence rule; one-thing selection; metrics from timestamps; timestamped quote lookup; code-note validation; v1 report display.
- `tests/dsa-stress.test.ts` — timing markers, stress-test grading (fast pass, correct-but-too-slow, judge timeout with partial output, wrong answer outranks timeout, browser runs never time-fail).
- `e2e/learn.spec.ts` — DSA academy filters and pages, pattern studied state, a quiz graded server-side (answer key absent from the page) turning misses into cards, an SM-2 review, the planner within budget, the system design lab's diagram, sketchpad and focused practice, and a real public-repo analysis.
- `e2e/content.spec.ts` — review gate on a fixture case that only exists on the local test server: draft/reviewed preview for admins, live for everyone, forged review writes denied, reports reach /review and new accounts can't auto-hide.
- `e2e/design.spec.ts` — draw on the Excalidraw board, the answer stores the board text, autosave + reload, no CSP violations, fonts only from our origin; end → report with SDE level, coverage from a verified board element, a dropped fabricated claim and red flags; time-driven phase jump with the event logged and the stepper updated.
- `e2e/design-lab.spec.ts` — drafts hidden from users; primer checks graded on the server; estimation grading and working; design drill key points need the candidate's words and misses become cards.
- `e2e/gaps.spec.ts` — opt-in public profile (404 by default, reserved handles rejected, visible logged-out without email, noindex, 404 again when turned off); forged writes with a real user session are denied (fake accepted submission, completed interview with a report, setting a score, a platform-sourced task, a transcript turn) while rating is allowed; notification bell; company styles page and pre-filled setup; interviewer characters and suggested difficulty. `core-loop` also checks the paste flag, next-step links and the emoji rating.
- `e2e/voice.spec.ts` — Chromium fake microphone fed a generated speech-like WAV: mic check opens the device, measures the noise floor, the VAD hears speech, record and playback; the voice room's settings dialog shows honest engine availability and settings persist across reloads.
- `e2e/dsa.spec.ts` — full round on the mock AI: setup with a chosen problem, failing then passing browser Run, graded hint, phase change, Submit through the public Judge0, autosave across reload, report with judge facts, then XP/rank/achievement on the progress page and the dashboard; plus Python Run (judge fallback while Pyodide loads, then in-browser), Python syntax-error line mapping, language switch and a C++ Judge0 run; a proactive nudge after a failed run.
