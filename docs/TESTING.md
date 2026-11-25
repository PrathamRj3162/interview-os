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
- `tests/dsa-stress.test.ts` — timing markers, stress-test grading (fast pass, correct-but-too-slow, judge timeout with partial output, wrong answer outranks timeout, browser runs never time-fail).
- `e2e/dsa.spec.ts` — full round on the mock AI: setup with a chosen problem, failing then passing browser Run, graded hint, phase change, Submit through the public Judge0, autosave across reload, report with judge facts; plus Python Run (judge fallback while Pyodide loads, then in-browser), Python syntax-error line mapping, language switch and a C++ Judge0 run.
