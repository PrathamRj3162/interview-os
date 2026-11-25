import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";
import { E2E_ADMIN_EMAIL } from "../playwright.config";

/**
 * Content review gate on a fixture case that only exists on the local E2E server (E2E_FIXTURES=1), so real
 * content is never touched: draft/reviewed → admin preview only; live → everyone; reports reach /review, and
 * brand-new accounts can't auto-hide an item. Users can't write reviews themselves.
 */
const stamp = Date.now();
const PW = `Content-pass-${stamp}`;
const ADMIN = E2E_ADMIN_EMAIL;
const USERS = [0, 1, 2].map((i) => `interview-os-content-${i}-${stamp}@example.com`);
const ID = "design-case:e2e-fixture";
const URL = "/system-design/e2e-fixture";

test.describe.configure({ mode: "serial" });
// Needs the local server Playwright starts (E2E_FIXTURES=1, ADMIN_EMAILS); never runs against a deployment.
test.skip(!!process.env.E2E_BASE_URL, "local test server only");
test.setTimeout(3 * 60_000);

const cleanup = async () => {
  await admin().from("content_reviews").delete().eq("item_id", ID);
  await admin().from("content_reports").delete().eq("item_id", ID);
};
test.beforeAll(async () => {
  await cleanup();
  for (const e of [ADMIN, ...USERS]) {
    const id = await ensureConfirmedUser(e, PW, "Cee Tester");
    await admin().from("profiles").update({ full_name: "Cee Tester", target_role: "backend", experience_level: "student", company_track: "product", target_companies: [], preferred_language: "python", daily_hours: 1, dsa_level: 3, system_design_level: 2, learning_style: "mixed", onboarded_at: new Date().toISOString() }).eq("id", id);
  }
});
test.afterAll(async () => { await cleanup(); for (const e of USERS) await deleteUserIfExists(e); await deleteUserIfExists(ADMIN); });

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
// Pages under (app) stream (loading.tsx), so notFound() renders the 404 page with HTTP 200: check the page itself.
async function expectNotFound(page: Page, url: string) { await page.goto(url); await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible(); }
async function expectCase(page: Page) { await page.goto(URL); await expect(page.getByRole("heading", { name: "E2E fixture case" })).toBeVisible(); }
const status = (page: Page) => page.getByTestId("review-item").filter({ hasText: "E2E fixture case" }).getByTestId("review-status");

test("review gate: draft hidden, reviewed is admin preview, live for everyone", async ({ page }) => {
  await login(page, USERS[0]);
  await expectNotFound(page, "/review");
  await expectNotFound(page, URL);

  // Users cannot write reviews through the Data API with their own session.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await sb.auth.signInWithPassword({ email: USERS[0], password: PW });
  const forged = await sb.from("content_reviews").insert({ item_id: ID, version: 1, status: "live" });
  expect(forged.error?.code).toBe("42501");

  await login(page, ADMIN);
  await page.goto(URL); // admins can read a draft before approving it
  await expect(page.getByText("Preview — not live")).toBeVisible();
  await page.goto("/review");
  await expect(status(page)).toHaveText("draft");
  await page.getByTestId("review-item").filter({ hasText: "E2E fixture case" }).getByRole("button", { name: "Mark reviewed" }).click();
  await expect(status(page)).toHaveText("reviewed");
  await page.goto(URL);
  await expect(page.getByText("Preview — not live")).toBeVisible();

  await login(page, USERS[0]);
  await expectNotFound(page, URL);

  await login(page, ADMIN);
  await page.goto("/review");
  await page.getByTestId("review-item").filter({ hasText: "E2E fixture case" }).getByRole("button", { name: "Make live" }).click();
  // A live item with passing checks and no reports leaves "Needs attention"; it's still under "All".
  await expect(page.getByTestId("review-item").filter({ hasText: "E2E fixture case" })).toHaveCount(0);
  await page.goto("/review?filter=all");
  await expect(status(page)).toHaveText("live");

  await login(page, USERS[0]);
  await expectCase(page);
  await expect(page.getByText("Preview — not live")).toHaveCount(0);
});

test("reports reach the admin; brand-new accounts can't hide an item", async ({ page }) => {
  for (const u of USERS) {
    await login(page, u);
    await page.goto(URL);
    await page.getByTestId("report-problem").click();
    await page.getByLabel("Something is wrong").check();
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByText(/Thanks — reported/)).toBeVisible();
  }
  // Only confirmed accounts at least 7 days old count toward auto-hiding (migration 0012), so throwaway
  // accounts can't take content down: the case stays visible.
  await login(page, USERS[0]);
  await expectCase(page);

  await login(page, ADMIN);
  await page.goto("/review");
  const row = page.getByTestId("review-item").filter({ hasText: "E2E fixture case" });
  await expect(row.getByText("3 open reports")).toBeVisible();
  await expect(row.getByText("hidden by reports")).toHaveCount(0);
  await row.getByRole("button", { name: "Resolve reports" }).click();
  await expect(row).toHaveCount(0); // live, passing checks, no open reports → no longer needs attention
});
