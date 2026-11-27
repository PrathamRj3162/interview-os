import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/**
 * Machine coding round on the mock AI and the real public Judge0: save a multi-file Java project, submit to the
 * hidden tests, the server reveals the new requirement on its clock (snapshot), the build freezes for the review,
 * and the report shows tests, the extensibility diff and code facts.
 */
const stamp = Date.now();
const EMAIL = `interview-os-mc-${stamp}@example.com`;
const PW = `Mc-pass-${stamp}`;
let userId = "";
const ref = (slug: string) => Object.fromEntries(readdirSync(join("mc-refs", slug)).map((f) => [f, readFileSync(join("mc-refs", slug, f), "utf8")]));

test.describe.configure({ mode: "serial" });
test.setTimeout(6 * 60_000);
test.beforeAll(async () => {
  userId = await ensureConfirmedUser(EMAIL, PW, "Em Cee");
  await admin().from("profiles").update({ full_name: "Em Cee", target_role: "backend", experience_level: "student", company_track: "product", target_companies: [], preferred_language: "java", daily_hours: 1, dsa_level: 3, system_design_level: 2, learning_style: "mixed", onboarded_at: new Date().toISOString() }).eq("id", userId);
});
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("machine coding: build, hidden tests, reveal at the server's clock, frozen review, measured report", async ({ page }) => {
  const starter = { "Main.java": "public class Main { public static void main(String[] a) { } }" };
  const { data: iv } = await admin().from("mock_interviews").insert({
    user_id: userId, kind: "machine_coding", difficulty: "medium", persona: "strict", mode: "mock", input_mode: "text", duration_min: 110,
    mc_problem: "splitwise", phase: "build", language: "java", workspace: { language: "java", files: starter },
  }).select("id").single();
  const id = iv!.id;
  await login(page);
  await page.goto(`/interview/${id}`);
  const ws = page.getByTestId("mc-workspace");
  await expect(ws.getByTestId("mc-requirements")).toContainText("Expense sharing app");
  await expect(ws.getByTestId("mc-extension")).toHaveCount(0); // not revealed yet
  await expect(page.getByLabel("Your answer")).toBeEnabled({ timeout: 30_000 }); // fixed opening, no AI

  // Users can't fake the snapshot through the Data API.
  const forged = await admin().from("mock_interviews").select("mc_snapshot").eq("id", id).single();
  expect(forged.data!.mc_snapshot).toBeNull();

  // Save a project with only the core (the reference without PERCENT), then submit before the reveal: core tests only.
  const full = ref("splitwise");
  const core = { ...full, "Splits.java": full["Splits.java"].replace('case "PERCENT" -> PERCENT;', "") };
  const save = await page.request.post(`/api/interview/${id}/mc`, { data: { action: "save", files: core } });
  expect(save.ok()).toBe(true);
  const sub1 = await (await page.request.post(`/api/interview/${id}/mc`, { data: { action: "submit", files: core } })).json();
  expect(sub1.submit.core).toEqual({ passed: 6, total: 6 }); // sample + 5 hidden core tests
  expect(sub1.submit.ext.total).toBe(0);

  // Move the clock past the reveal (minute 60 of 90): the next request snapshots the saved files.
  await admin().from("mock_interviews").update({ started_at: new Date(Date.now() - 61 * 60_000).toISOString() }).eq("id", id);
  await page.reload();
  const st = await (await page.request.post(`/api/interview/${id}/mc`, { data: { action: "state" } })).json();
  expect(st.revealed).toBe(true);
  await page.reload();
  await expect(page.getByTestId("mc-extension")).toContainText("Percentage splits");

  // Implement the extension (the full reference) and submit from the UI.
  await page.request.post(`/api/interview/${id}/mc`, { data: { action: "save", files: full } });
  await page.reload();
  await page.getByRole("button", { name: "Submit (hidden tests)" }).click();
  await expect(page.getByTestId("mc-submit-result")).toContainText("core 6/6 · new requirement 3/3", { timeout: 90_000 });

  // Finish the build → review; the code is frozen.
  await page.getByRole("button", { name: "Finish build" }).click();
  await page.getByRole("button", { name: "Start the review" }).click();
  await expect(page.getByTestId("mc-phase")).toContainText("Code review");
  const frozen = await page.request.post(`/api/interview/${id}/mc`, { data: { action: "save", files: full } });
  expect(frozen.status()).toBe(409);

  await page.getByLabel("Your answer").fill("I used a strategy per split type, so percent was one new class and one line in the factory.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByLabel("Your answer")).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("button", { name: "Yes, end" }).click();
  await expect(page).toHaveURL(/\/report$/, { timeout: 120_000 });

  const m = page.getByTestId("mc-report");
  await expect(m.getByTestId("mc-core")).toContainText("6/6");
  await expect(m).toContainText("3/3 new requirement");
  await expect(m.getByTestId("mc-diff")).toContainText(/1 changed/);
  // Completeness and extensibility come from the tests and the diff, labelled as measured.
  const { data: rep } = await admin().from("mock_interviews").select("report").eq("id", id).single();
  const cats = (rep!.report as { categories: { id: string; score: number | null; source: string }[] }).categories;
  expect(cats.find((c) => c.id === "completeness")).toMatchObject({ score: 4, source: "judge" });
  expect(cats.find((c) => c.id === "extensibility")).toMatchObject({ score: 4, source: "judge" });
  expect(cats.some((c) => c.id === "concurrency")).toBe(false); // not a concurrency problem
});
