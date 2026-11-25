import { defineConfig, devices } from "@playwright/test";

// Test helpers need the same Supabase credentials as the app.
try { process.loadEnvFile(".env.local"); } catch {}

export const E2E_ADMIN_EMAIL = "interview-os-e2e-admin@example.com";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  // E2E_BASE_URL=https://… runs the same suite against a deployed site (no local server).
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    // AI_MOCK=1: deterministic offline AI so E2E never spends free provider quota.
    // ADMIN_EMAILS: the e2e admin account can use /review (production has its own value in Vercel env).
    command: `npm run build && AI_MOCK=${process.env.E2E_AI_MOCK ?? "1"} ADMIN_EMAILS=${E2E_ADMIN_EMAIL} E2E_FIXTURES=1 npm run start -- -p 3000`,
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    stdout: "pipe", // surface server [ai] timing logs in test output
    timeout: 300_000,
  },
});
