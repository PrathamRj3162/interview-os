import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/** Opt-in public profile, notification bell, company styles, interviewer characters, hardened writes. */
const stamp = Date.now();
const EMAIL = `interview-os-gaps-${stamp}@example.com`;
const PASSWORD = `Gaps-pass-${stamp}`;
const HANDLE = `e2e_${String(stamp).slice(-8)}`;
let userId = "";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  userId = await ensureConfirmedUser(EMAIL, PASSWORD, "Gia Pass");
  await admin().from("profiles").update({
    full_name: "Gia Pass", target_role: "backend", experience_level: "student", company_track: "product",
    target_companies: [], preferred_language: "python", daily_hours: 2, dsa_level: 3, system_design_level: 2,
    learning_style: "mixed", onboarded_at: new Date().toISOString(),
  }).eq("id", userId);
  // One accepted submission so the public page has something to show (inserted by the server-side role, as the app does).
  await admin().from("submissions").insert({ user_id: userId, problem_slug: "two-sum", language: "python", code: "x", status: "accepted", passed: 10, total: 10, hints_used: 0 });
});
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("public profile is opt-in, visible logged out, and disappears when turned off", async ({ page, browser }) => {
  await login(page);
  const anon = await browser.newContext();
  const visitor = await anon.newPage();
  expect((await visitor.goto(`/u/${HANDLE}`))?.status()).toBe(404); // off by default

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Handle").fill("admin");
  await page.getByLabel(/Make a public profile page/).check();
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText("That handle is reserved. Pick another.")).toBeVisible();
  await page.getByLabel("Handle").fill(HANDLE);
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText(`Public profile is on: /u/${HANDLE}`)).toBeVisible();

  await visitor.goto(`/u/${HANDLE}`);
  await expect(visitor.getByRole("heading", { name: /Gia/ })).toBeVisible();
  await expect(visitor.getByTestId("public-rank")).toContainText(/Intern III/);
  await expect(visitor.getByText("Hello, Judge")).toBeVisible();
  await expect(visitor.locator("body")).not.toContainText(EMAIL);
  expect(await visitor.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");

  await page.getByLabel(/Make a public profile page/).uncheck();
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText("Public profile is off.")).toBeVisible();
  expect((await visitor.goto(`/u/${HANDLE}`))?.status()).toBe(404);
  await anon.close();
});

test("hardened writes: a user can't forge scores or submissions with their own session", async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error: signInError } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  expect(signInError).toBeNull();
  // Insert a fake accepted submission → denied.
  const sub = await sb.from("submissions").insert({ user_id: userId, problem_slug: "three-sum", language: "python", code: "x", status: "accepted", passed: 1, total: 1 });
  expect(sub.error?.code).toBe("42501");
  // Create an interview as a "completed" one with a report → denied (status/report aren't insertable).
  const forged = await sb.from("mock_interviews").insert({ user_id: userId, kind: "hr", difficulty: "expert", persona: "hr", duration_min: 10, status: "completed", overall_score: 100, report: { verdict: { level: "strong_hire" } } });
  expect(forged.error?.code).toBe("42501");
  // A legitimate interview row can be created, but its score can't be set afterwards.
  const ok = await sb.from("mock_interviews").insert({ user_id: userId, kind: "hr", difficulty: "easy", persona: "hr", duration_min: 10 }).select("id").single();
  expect(ok.error).toBeNull();
  const upd = await sb.from("mock_interviews").update({ status: "completed", overall_score: 100 }).eq("id", ok.data!.id);
  expect(upd.error?.code).toBe("42501");
  // Allowed: rating your own interview.
  const rate = await sb.from("mock_interviews").update({ user_rating: 4 }).eq("id", ok.data!.id).select("user_rating").single();
  expect(rate.data?.user_rating).toBe(4);
  await admin().from("mock_interviews").delete().eq("id", ok.data!.id);
  // Tasks: users can add their own, but can't mark one as platform-made (only those earn XP).
  const { data: plan } = await admin().from("study_plans").insert({ user_id: userId, inputs: {} }).select("id").single();
  const forgedTask = await sb.from("study_tasks").insert({ plan_id: plan!.id, user_id: userId, due_date: "2026-11-25", kind: "lesson", title: "x", source: "planner" });
  expect(forgedTask.error?.code).toBe("42501");
  const own = await sb.from("study_tasks").insert({ plan_id: plan!.id, user_id: userId, due_date: "2026-11-25", kind: "lesson", title: "mine" }).select("id, source").single();
  expect(own.data?.source).toBe("user");
  const flip = await sb.from("study_tasks").update({ source: "planner" }).eq("id", own.data!.id);
  expect(flip.error?.code).toBe("42501");
});

test("notifications bell, company styles and interviewer characters", async ({ page }) => {
  await login(page);
  await page.waitForLoadState("networkidle");
  const bell = page.getByTestId("bell").first();
  await bell.click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText(/Achievement: Hello, Judge|You're all caught up/)).toBeVisible();

  await page.goto("/companies");
  await expect(page.getByTestId("company-disclaimer")).toContainText("Style practice — not actual company questions");
  await expect(page.getByRole("heading", { name: "Flipkart" })).toBeVisible();
  await page.getByRole("heading", { name: "Flipkart" }).locator("..").getByRole("link", { name: "DSA in this style" }).click();
  await expect(page).toHaveURL(/kind=dsa&company=Flipkart/);
  await expect(page.getByLabel("Target company")).toHaveValue("Flipkart");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Ishaan · DSA Specialist").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Ishaan, DSA Specialist/ })).toBeVisible();
  await expect(page.getByText(/Suggested: medium\./)).toBeVisible();
});
