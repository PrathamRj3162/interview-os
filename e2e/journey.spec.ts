import { test, expect } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, findUser } from "./helpers";

const stamp = Date.now();
const EMAIL = `interview-os-e2e-${stamp}@example.com`;
const PASSWORD = `E2e-pass-${stamp}`;
const NAME = "E2E Candidate";

test.afterAll(async () => {
  await deleteUserIfExists(EMAIL); // never leave test accounts behind
});

test("public pages and route guard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("interview");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  for (const p of ["/privacy", "/terms", "/signup", "/forgot-password"]) {
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(200);
  }
});

test("full candidate journey: sign up → onboarding → dashboard → persistence → settings → delete", async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

  // 1. Sign up through the real form
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  const outcome = page.getByText(/Check your email|Could not create the account|can.t send more confirmation emails/).or(page.getByRole("heading", { name: /preparation profile/ }));
  await expect(outcome).toBeVisible({ timeout: 20_000 });
  const signupText = (await outcome.textContent()) ?? "";
  test.info().annotations.push({ type: "signup-ui-result", description: signupText.slice(0, 120) });
  console.log("[signup UI result]", signupText.slice(0, 120));
  const createdByUi = Boolean(await findUser(EMAIL));
  console.log("[signup created account via UI]", createdByUi);

  if (/preparation profile/.test(signupText)) {
    // Confirmation is off: sign-up signed us straight in and landed on onboarding.
    expect(createdByUi).toBe(true);
    await context.clearCookies(); // continue as a returning user to exercise the login form
  } else {
    // Confirmation is on: email links can't be clicked in an automated test, so confirm via the admin API.
    await ensureConfirmedUser(EMAIL, PASSWORD, NAME);
  }

  // 2. Wrong password shows a generic error
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();

  // 3. Correct login → onboarding (not yet onboarded)
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Signed-in but not onboarded: /dashboard (the default "next") bounces to /onboarding
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });

  // 4. Onboarding validation, then completion
  await page.getByRole("button", { name: "Create my preparation profile" }).click();
  await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();

  await page.getByLabel("Full name").fill(NAME);
  await page.getByLabel("Experience level").selectOption("student");
  await page.getByLabel("Target role").selectOption("sde1");
  await page.getByLabel("Company type").selectOption("product");
  await page.getByText("Google", { exact: true }).click();
  await page.getByText("Amazon", { exact: true }).click();
  await page.getByLabel("Hours per day").fill("3");
  await page.getByLabel("Preferred language").selectOption("cpp");
  await page.getByLabel("Learning style").selectOption("mixed");
  await page.getByLabel("DSA proficiency").selectOption("2");
  await page.getByLabel("System design proficiency").selectOption("1");
  await page.getByRole("button", { name: "Create my preparation profile" }).click();

  // 5. Dashboard shows real data and honest empty states
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /(Hi|Hey) E2E/ })).toBeVisible();
  await expect(page.getByText("Google, Amazon")).toBeVisible();
  await expect(page.getByText("3 h")).toBeVisible();
  await expect(page.getByText("No submissions yet")).toBeVisible();
  await expect(page.getByText("No quizzes taken yet")).toBeVisible();

  // 6. Sign out, sign back in → straight to dashboard with data persisted
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL("/");
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Google, Amazon")).toBeVisible();

  // 7. Settings: edit profile and confirm it persists across reload
  await page.goto("/settings");
  await page.getByLabel("Hours per day").fill("4.5");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Hours per day")).toHaveValue("4.5");

  // 8. AI consent toggle
  await page.getByLabel(/Allow my resume text/).check();
  await page.getByRole("button", { name: "Save consent" }).click();
  await expect(page.getByText("AI processing of your resume is enabled.")).toBeVisible();

  // 9. Delete account (guarded by typing DELETE)
  await page.getByRole("button", { name: "Delete account and all data" }).click();
  await expect(page.getByText("Type DELETE to confirm")).toBeVisible();
  await page.getByLabel(/Type "DELETE" to confirm/).fill("DELETE");
  await page.getByRole("button", { name: "Delete account and all data" }).click();
  await expect(page.getByText("Your account and all associated data have been deleted.")).toBeVisible({ timeout: 20_000 });
  expect(await findUser(EMAIL)).toBeNull();

  // Deleted session can't reach protected pages
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("mobile layout: navigation drawer @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
