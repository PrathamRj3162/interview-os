import { test, expect, type Page } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/**
 * DSA live-coding round, end to end (mock AI locally):
 * setup with a chosen problem → problem | editor | interviewer layout → JS Run in the browser (failing,
 * then passing) → graded hint → phase advances → Submit through the real public Judge0 → report shows
 * the judge result. Submit is the only external call; it can take ~20 s on the free judge.
 */
const stamp = Date.now();
const EMAIL = `interview-os-dsa-${stamp}@example.com`;
const PASSWORD = `Dsa-pass-${stamp}`;

test.describe.configure({ mode: "serial" });
test.setTimeout(5 * 60_000);

test.beforeAll(async () => {
  const id = await ensureConfirmedUser(EMAIL, PASSWORD, "Dev Kumar");
  await admin().from("profiles").update({
    full_name: "Dev Kumar", target_role: "backend", experience_level: "student", company_track: "product",
    target_companies: [], preferred_language: "javascript", daily_hours: 2, dsa_level: 3, system_design_level: 2,
    learning_style: "mixed", onboarded_at: new Date().toISOString(),
  }).eq("id", id);
});
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

async function typeCode(page: Page, code: string) {
  const editor = page.getByTestId("code-editor");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

test("DSA round: code, run, hint, submit, report", async ({ page }) => {
  await login(page);
  await page.goto("/interview/new?kind=dsa");
  await page.getByRole("radio", { name: "DSA & live coding" }).check({ force: true });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByText("Practice", { exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Answer by").selectOption("text");
  await page.getByLabel("Problem", { exact: true }).selectOption("two-sum");
  await page.getByLabel("Programming language").selectOption("javascript");
  await page.getByRole("button", { name: "Start interview" }).click();
  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]{36}$/, { timeout: 20_000 });

  // Three panes + deterministic opening (no AI call)
  await expect(page.getByRole("heading", { name: "Two Sum", exact: true })).toBeVisible();
  await expect(page.getByTestId("code-editor")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/We'll work through one problem: "Two Sum"/)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[aria-label="Interview phase"] [aria-current="step"]')).toHaveText("Intro");

  // A wrong solution fails the examples, in the browser
  await typeCode(page, "function twoSum(nums, target) {\n  return [0, 0];\n}\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Wrong answer")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/0\/3 passed · run · in browser/)).toBeVisible();

  // Graded hint (practice mode), logged and counted
  await page.getByRole("button", { name: /Hint 0\/3/ }).click();
  await expect(page.getByRole("region", { name: "Interview transcript" }).getByText("Hint 1/3")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Hint 1\/3/ })).toBeVisible();

  // Talk → the phase machine moves on
  await page.getByLabel("Your answer").fill("We need two indices whose values add up to target. Can values repeat?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[aria-label="Interview phase"] [aria-current="step"]')).not.toHaveText("Intro", { timeout: 30_000 });

  // A correct solution passes the examples, then Submit runs the hidden tests on Judge0
  await typeCode(page, "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Examples passed")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("All tests passed")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/Hidden tests: \d+\/\d+ passed/)).toBeVisible();

  // Code survives a reload (autosave)
  await page.reload();
  await expect(page.getByTestId("code-editor")).toContainText("seen.set(nums[i], i)", { timeout: 20_000 });

  // End → report with objective coding facts
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("button", { name: "Yes, end" }).click();
  await expect(page).toHaveURL(/\/report$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: /Coding — Two Sum/ })).toBeVisible();
  await expect(page.getByText(/Accepted · \d+\/\d+/)).toBeVisible();
  await expect(page.getByText("1/3", { exact: true })).toBeVisible(); // hints used
  await expect(page.getByText(/Optimal approach/)).toBeVisible();
  // Report v2: judge-backed correctness, annotated final code (the fabricated mock note is discarded), next problems
  await expect(page.getByTestId("verdict")).toBeVisible();
  await expect(page.getByText("from the judge")).toBeVisible();
  await expect(page.getByTestId("annotated-code")).toContainText("Mock note: check the empty input here.");
  await expect(page.getByTestId("annotated-code")).not.toContainText("Fabricated note");
  await expect(page.getByText(/1 note\(s\) didn't match your code and were discarded/)).toBeVisible();
  await expect(page.getByText(/Practise next/)).toBeVisible();
});

test("DSA round: Python runs in the browser (Pyodide); C++ runs on the judge; mock mode has no hints", async ({ page }) => {
  await login(page);
  await page.goto("/interview/new?kind=dsa");
  await page.getByRole("radio", { name: "DSA & live coding" }).check({ force: true });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click(); // mock mode is the default
  await page.getByLabel("Answer by").selectOption("text");
  await page.getByLabel("Problem", { exact: true }).selectOption("valid-parentheses");
  await page.getByLabel("Programming language").selectOption("python");
  await page.getByRole("button", { name: "Start interview" }).click();
  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByTestId("code-editor")).toContainText("def isValid", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /Hint/ })).toHaveCount(0);

  await typeCode(page, "class Solution:\n    def isValid(self, s: str) -> bool:\n        st = []\n        pairs = {')': '(', ']': '[', '}': '{'}\n        for c in s:\n            if c in pairs:\n                if not st or st.pop() != pairs[c]:\n                    return False\n            else:\n                st.append(c)\n        return not st\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  // While Pyodide (~10 MB) is still loading, Run falls back to the judge instead of making you wait.
  await expect(page.getByText("Examples passed")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/4\/4 passed · run · (in browser|Judge0)/)).toBeVisible();
  // Once loaded, Run stays in the browser.
  await expect(page.getByTestId("python-status")).toHaveText("Py ready", { timeout: 90_000 });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText(/4\/4 passed · run · in browser/)).toBeVisible({ timeout: 30_000 });

  // A syntax error is reported against the candidate's own line numbers.
  await typeCode(page, "class Solution:\n    def isValid(self, s: str) -> bool\n        return True\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Compile error")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/line 2/).first()).toBeVisible();

  // Switching language loads the C++ starter; Run goes to Judge0.
  await page.getByLabel("Language").selectOption("cpp");
  await expect(page.getByTestId("code-editor")).toContainText("bool isValid(string& s)");
  await typeCode(page, "class Solution {\npublic:\n    bool isValid(string& s) {\n        string st;\n        for (char c : s) {\n            if (c == '(' || c == '[' || c == '{') st.push_back(c);\n            else {\n                if (st.empty()) return false;\n                char o = st.back(); st.pop_back();\n                if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;\n            }\n        }\n        return st.empty();\n    }\n};\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Examples passed")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/4\/4 passed · run · Judge0/)).toBeVisible();
});
