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
