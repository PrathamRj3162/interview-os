import { test, expect, type Page } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";
import { E2E_ADMIN_EMAIL } from "../playwright.config";
import { makeDrill } from "../src/lib/learn/estimation";

/**
 * Building-block primers, the estimation trainer and the design fundamentals drill. They ship as drafts, so a
 * regular user doesn't see them yet; the admin (local test server's ADMIN_EMAILS) uses them in preview.
 */
const stamp = Date.now();
const PW = `Lab-pass-${stamp}`;
const USER = `interview-os-lab-${stamp}@example.com`;
let adminId = "";

test.describe.configure({ mode: "serial" });
test.skip(!!process.env.E2E_BASE_URL, "local test server only");
test.setTimeout(3 * 60_000);
test.beforeAll(async () => {
  for (const e of [E2E_ADMIN_EMAIL, USER]) {
    const id = await ensureConfirmedUser(e, PW, "Lab Tester");
    if (e === E2E_ADMIN_EMAIL) adminId = id;
    await admin().from("profiles").update({ full_name: "Lab Tester", target_role: "backend", experience_level: "student", company_track: "product", target_companies: [], preferred_language: "python", daily_hours: 1, dsa_level: 3, system_design_level: 2, learning_style: "mixed", onboarded_at: new Date().toISOString() }).eq("id", id);
  }
});
test.afterAll(async () => { await deleteUserIfExists(USER); await deleteUserIfExists(E2E_ADMIN_EMAIL); });

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("users see exactly the live items (whatever has been approved on /review)", async ({ page }) => {
  // Read the real review state, since this suite shares the database with the live site.
  const { data: rows } = await admin().from("content_reviews").select("item_id, version, status");
  const live = new Set((rows ?? []).filter((r) => r.status === "live").map((r) => r.item_id));
  const livePrimers = [...live].filter((x) => x.startsWith("primer:")).length;
  const liveQuestions = [...live].filter((x) => x.startsWith("design-question:")).length;
  await login(page, USER);
  await page.goto("/system-design/primers");
  if (livePrimers === 0) await expect(page.getByText(/being reviewed/)).toBeVisible();
  else await expect(page.locator("main li a[href^='/system-design/primers/']")).toHaveCount(livePrimers);
  await expect(page.getByText("Preview", { exact: true })).toHaveCount(0); // users never see previews
  await page.goto("/system-design/estimation");
  if (live.has("estimation-drill:templates")) await expect(page.getByTestId("estimation-trainer")).toBeVisible();
  else await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/system-design/drill");
  if (liveQuestions < 5) await expect(page.getByText(/being reviewed/)).toBeVisible();
  else await expect(page.getByTestId("design-drill")).toBeVisible();
});

test("primer: 30-second answer and server-graded check questions", async ({ page }) => {
  await login(page, E2E_ADMIN_EMAIL);
  await page.goto("/system-design/primers");
  await page.getByRole("link", { name: /Consistent hashing/ }).click();
  await expect(page.getByTestId("answer30")).toContainText("ring");
  expect(await page.content()).not.toMatch(/"answer":\d/); // the key isn't sent to the browser
  const check = page.getByTestId("primer-check");
  // Correct answers: Almost all keys / Spread load evenly / 1/N of the keys.
  await check.getByLabel("Almost all keys").check();
  await check.getByLabel("Spread load evenly across physical nodes").check();
  await check.getByLabel("1/N of the keys").check();
  await check.getByRole("button", { name: "Check answers" }).click();
  await expect(check.getByText("3/3 correct — marked as studied.")).toBeVisible();
  const { data } = await admin().from("user_progress").select("status").eq("user_id", adminId).eq("item_slug", "primer:consistent-hashing").single();
  expect(data!.status).toBe("completed");
});

test("estimation trainer grades within 25% and shows the working", async ({ page }) => {
  await login(page, E2E_ADMIN_EMAIL);
  await page.goto("/system-design/estimation");
  const d = makeDrill(1); // the first drill is seed 1 (deterministic)
  const t = page.getByTestId("estimation-trainer");
  await expect(t.getByTestId("drill-story")).toHaveText(d.story);
  for (const q of d.questions) await t.getByLabel(q.label).fill(String(d.answers[q.key] * (q.key === "readQps" ? 10 : 1.1)));
  await t.getByRole("button", { name: "Check" }).click();
  await expect(t.getByRole("status")).toHaveText("4/5 within 25%");
  await expect(t.getByText(/Off by more than 3×/)).toBeVisible();
  await expect(t.getByText(/÷ 86,400/).first()).toBeVisible();
  await expect(page.getByTestId("reference-card")).toContainText("86,400");
});

test("design fundamentals drill: key points need the candidate's own words; misses become cards", async ({ page }) => {
  await login(page, E2E_ADMIN_EMAIL);
  await page.goto("/system-design/drill");
  const boxes = page.getByTestId("design-drill").locator("textarea");
  await expect(boxes).toHaveCount(5);
  for (let i = 0; i < 5; i++) await boxes.nth(i).fill(`For this one I would first look at metrics and then fix the slowest tier ${i}.`);
  await page.getByRole("button", { name: "Submit answers" }).click();
  const res = page.getByTestId("drill-results");
  await expect(res).toBeVisible({ timeout: 30_000 });
  await expect(res.getByText(/^\d+\/\d+ key points covered$/)).toBeVisible();
  await expect(res.getByText(/5 claim\(s\) didn't match your answer and were discarded/)).toBeVisible();
  await expect(res.getByText(/“For this one I”/).first()).toBeVisible();
  const { count } = await admin().from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", adminId).eq("topic", "System design");
  expect(count).toBeGreaterThan(0);
});

test("LLD lab: SOLID before/after and a shared case links to its machine coding build", async ({ page }) => {
  await login(page, E2E_ADMIN_EMAIL);
  await page.goto("/system-design/lld");
  await page.getByRole("link", { name: /SOLID, with before-and-after Java/ }).click();
  await expect(page.getByTestId("lld-section").first()).toContainText("Before");
  await expect(page.getByText("class FeeCalculator")).toBeVisible();
  await page.goto("/system-design/vending-machine");
  await expect(page.getByTestId("build-it")).toHaveAttribute("href", "/interview/new?kind=machine_coding&mc=vending-machine");
  await page.getByTestId("build-it").click();
  await expect(page.getByLabel("Problem", { exact: true }).or(page.locator("#mc_problem"))).toHaveCount(1);
});
