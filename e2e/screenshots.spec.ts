import { test } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";
import { makePdf, SAMPLE_RESUME } from "./make-pdf";

/** Regenerates README screenshots: `E2E_AI_MOCK=0 npx playwright test e2e/screenshots.spec.ts` (real provider list shown; makes no AI calls). */
const EMAIL = `interview-os-shots-${Date.now()}@example.com`, PW = "Shots-pass-12345";
test.skip(!!process.env.CI, "local only");
test.setTimeout(180_000);
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

// SHOTS_DIR=docs/redesign/before (or after) writes desktop + mobile shots for the redesign comparison.
const DIR = process.env.SHOTS_DIR ?? "docs/screenshots";
const MOBILE = Boolean(process.env.SHOTS_DIR);

test("capture screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const shot = async (name: string) => {
    await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
    if (MOBILE) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${DIR}/${name}-mobile.png`, fullPage: false });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
  };
  await page.goto("/"); await page.waitForLoadState("networkidle"); await shot("landing");
  const id = await ensureConfirmedUser(EMAIL, PW, "Asha Rao");
  await admin().from("profiles").update({ full_name: "Asha Rao", target_role: "backend", experience_level: "student", company_track: "product", target_companies: ["Amazon", "Google"], preferred_language: "python", daily_hours: 3, dsa_level: 3, system_design_level: 2, learning_style: "mixed", onboarded_at: new Date().toISOString() }).eq("id", id);
  await page.goto("/login"); await page.getByLabel("Email").fill(EMAIL); await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click(); await page.waitForURL(/dashboard/);
  await page.goto("/resume"); await page.waitForLoadState("networkidle"); // hydrate before attaching the file
  await page.setInputFiles("#resume", { name: "Asha_Rao_Resume.pdf", mimeType: "application/pdf", buffer: makePdf(SAMPLE_RESUME) });
  await page.getByRole("button", { name: "Upload and analyse" }).click();
  await page.waitForURL(/\/resume\/[0-9a-f-]{36}$/);
  await page.getByText("How the score was calculated").scrollIntoViewIfNeeded(); await shot("resume-report");
  await page.goto("/interview/new"); await page.getByRole("button", { name: /^Next/ }).waitFor(); await shot("interview-setup");
  await page.goto("/dashboard"); await page.getByText("Recommended next step").waitFor(); await shot("dashboard");
  await page.goto("/system-design/url-shortener"); await page.getByText("Reference architecture diagram").click();
  await page.getByTestId("design-diagram").scrollIntoViewIfNeeded(); await shot("system-design");
  // DSA round: opening is deterministic (no AI call); Run happens in the browser.
  await page.goto("/interview/new?kind=dsa");
  await page.getByRole("radio", { name: "DSA & live coding" }).check({ force: true });
  await page.getByRole("button", { name: "Next" }).click(); await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Answer by").selectOption("text");
  await page.getByLabel("Problem", { exact: true }).selectOption("longest-substring-no-repeat");
  await page.getByLabel("Programming language").selectOption("python");
  await page.getByRole("button", { name: "Start interview" }).click();
  await page.getByTestId("code-editor").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        last, left, best = {}, 0, 0\n        for i, c in enumerate(s):\n            if last.get(c, -1) >= left:\n                left = last[c] + 1\n            last[c] = i\n            best = max(best, i - left + 1)\n        return best\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByText("Examples passed").waitFor({ timeout: 90_000 });
  await shot("dsa-room");
});
