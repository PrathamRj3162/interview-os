# Redesign: before / after

Direction: "neon-retro, but grown-up" — 80% calm dev tool, 20% neon flavour (hero, wordmark, primary CTA, focus glow).
Design system: [/design](https://interview-os-psi.vercel.app/design) · tokens in `src/app/globals.css` · WCAG AA enforced by `tests/design-tokens.test.ts`.

| Page | Before | After |
|---|---|---|
| Landing | ![](before/landing.png) | ![](after/landing.png) |
| Landing (mobile) | ![](before/landing-mobile.png) | ![](after/landing-mobile.png) |
| Dashboard | ![](before/dashboard.png) | ![](after/dashboard.png) |
| Dashboard (mobile) | ![](before/dashboard-mobile.png) | ![](after/dashboard-mobile.png) |
| Interview setup | ![](before/interview-setup.png) | ![](after/interview-setup.png) |
| Interview setup (mobile) | ![](before/interview-setup-mobile.png) | ![](after/interview-setup-mobile.png) |
| Resume report | ![](before/resume-report.png) | ![](after/resume-report.png) |
| Resume report (mobile) | ![](before/resume-report-mobile.png) | ![](after/resume-report-mobile.png) |

Regenerate: `E2E_AI_MOCK=0 SHOTS_DIR=docs/redesign/after npx playwright test e2e/screenshots.spec.ts`
