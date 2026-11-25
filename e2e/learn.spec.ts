import { test, expect, type Page } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/** DSA academy, CS fundamentals quiz → revision cards, SM-2 review, planner, system design lab, project deep-dive. */
const stamp = Date.now();
const EMAIL = `interview-os-learn-${stamp}@example.com`;
const PASSWORD = `Learn-pass-${stamp}`;

test.describe.configure({ mode: "serial" });
test.setTimeout(3 * 60_000);
test.beforeAll(async () => {
  const id = await ensureConfirmedUser(EMAIL, PASSWORD, "Lee Arn");
  await admin().from("profiles").update({
    full_name: "Lee Arn", target_role: "backend", experience_level: "student", company_track: "product",
    target_companies: [], preferred_language: "python", daily_hours: 1, dsa_level: 3, system_design_level: 2,
    learning_style: "mixed", onboarded_at: new Date().toISOString(),
  }).eq("id", id);
  await admin().from("submissions").insert({ user_id: id, problem_slug: "three-sum", language: "python", code: "x", status: "wrong_answer", passed: 3, total: 10, hints_used: 0 });
});
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("DSA academy: filter, problem page, pattern guide, practise link", async ({ page }) => {
  await login(page);
  await page.goto("/dsa?status=attempted");
  await expect(page.getByRole("link", { name: /3Sum/ })).toBeVisible();
  await page.goto("/dsa?topic=Tree&difficulty=easy");
  await expect(page.getByRole("link", { name: /Invert Binary Tree/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Two Sum/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Invert Binary Tree/ }).click();
  await expect(page.getByRole("heading", { name: "Invert Binary Tree", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Practise \(hints on\)/ })).toHaveAttribute("href", /problem=invert-binary-tree&mode=practice/);
  await page.goto("/dsa/patterns/trees");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Mark as studied" }).click();
  await expect(page.getByRole("button", { name: "Marked as studied" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Marked as studied" })).toBeVisible();
});

test("fundamentals quiz is graded on the server, misses become revision cards, SM-2 review works", async ({ page }) => {
  await login(page);
  await page.goto("/fundamentals/os/quiz");
  // The answer key is not in the page.
  expect(await page.content()).not.toMatch(/"answer":/);
  const groups = page.locator("fieldset");
  await expect(groups).toHaveCount(10);
  for (let i = 0; i < 10; i++) await groups.nth(i).locator('input[type="radio"]').first().check();
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page).toHaveURL(/\/fundamentals\/result\//);
  const heading = await page.getByRole("heading", { level: 1 }).textContent();
  const [score] = heading!.match(/(\d+)\/10/)!.slice(1).map(Number);
  console.log("[quiz]", heading);
  if (score < 10) {
    await expect(page.getByText(/added to your revision deck/)).toBeVisible();
    await page.goto("/revision");
    await expect(page.getByTestId("review-card")).toBeVisible();
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: "Good" }).click();
    await expect(page.getByText(/left|Done —/).first()).toBeVisible();
  }
  await page.goto("/fundamentals");
  await expect(page.getByText(/1 attempt, last \d+\/10/)).toBeVisible();
});

test("planner builds a week within the daily budget", async ({ page }) => {
  await login(page);
  await page.goto("/planner");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Plan my week" }).click();
  await expect(page.getByText(/Planned \d+ tasks? for the next 7 days/)).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByText('Finish "3Sum"')).toBeVisible();
  await expect(page.getByTestId("planner-today")).toContainText(/\/60 min/);
  await page.getByRole("button", { name: "Plan my week" }).click();
  await expect(page.getByText(/already planned|Planned \d+ task/)).toBeVisible({ timeout: 20_000 });
});

test("system design lab: reveal sections and practise with a focused topic", async ({ page }) => {
  await login(page);
  await page.goto("/system-design");
  await page.getByRole("link", { name: /URL shortener/ }).click();
  await page.getByText("Back-of-the-envelope estimates").click();
  await expect(page.getByText(/62⁷/)).toBeVisible();
  await page.getByTestId("practise-design").click();
  await expect(page.getByText(/Focus: Design: URL shortener/)).toBeVisible();
});

test("project deep-dive: add a repo, analyse it, practise", async ({ page }) => {
  await login(page);
  await page.goto("/projects");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Project title").fill("Interview OS");
  await page.getByLabel(/Public GitHub URL/).fill("https://github.com/PrathamRj3162/interview-os");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByText("Project added.")).toBeVisible();
  await page.getByRole("button", { name: "Analyse repository" }).click();
  await expect(page.getByText(/Analysed PrathamRj3162\/interview-os|GitHub's free API limit/)).toBeVisible({ timeout: 45_000 });
  if (await page.getByText(/Analysed/).isVisible()) {
    await page.getByRole("link", { name: /likely questions/ }).click();
    await expect(page.getByTestId("project-analysis")).toContainText("TypeScript");
  }
  await page.getByRole("link", { name: /Practise a deep dive/ }).first().click();
  await expect(page).toHaveURL(/kind=project&persona=skeptic&project=/);
});
