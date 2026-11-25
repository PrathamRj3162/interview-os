import { test, expect, type Page } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";
import { makePdf, SAMPLE_RESUME } from "./make-pdf";

/**
 * The connected core loop against the real database and real AI provider:
 * onboard → upload resume → rules report → AI claims → mock interview (text) → report → tasks on dashboard.
 */
const stamp = Date.now();
const EMAIL = `interview-os-core-${stamp}@example.com`;
const PASSWORD = `Core-pass-${stamp}`;

test.describe.configure({ mode: "serial" });
test.setTimeout(12 * 60_000); // free AI tiers can be slow; each step has its own tighter timeout

test.beforeAll(async () => {
  const id = await ensureConfirmedUser(EMAIL, PASSWORD, "Asha Rao");
  await admin().from("profiles").update({
    full_name: "Asha Rao", target_role: "backend", experience_level: "student", company_track: "product",
    target_companies: ["Amazon"], preferred_language: "python", daily_hours: 3, dsa_level: 3, system_design_level: 2,
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

test("resume: rejects invalid files, analyses a real PDF, generates verbatim claims", async ({ page }) => {
  await login(page);
  await page.goto("/resume");
  await page.waitForLoadState("networkidle"); // hydrate before attaching a file, or the change event is lost
  // Attach a file and wait for the form to accept it (re-attach once if a re-render swallowed the change).
  const upload = async (file: Parameters<Page["setInputFiles"]>[1]) => {
    const button = page.getByRole("button", { name: "Upload and analyse" });
    await page.setInputFiles("#resume", file);
    if (!(await button.isEnabled())) { await page.waitForTimeout(500); await page.setInputFiles("#resume", file); }
    await expect(button).toBeEnabled({ timeout: 10_000 });
    await button.click();
  };

  // Invalid file (text renamed to .pdf) is rejected by magic-byte sniffing
  await upload({ name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("hello, not a pdf ".repeat(50)) });
  await expect(page.getByText("Only PDF and DOCX resumes are supported.")).toBeVisible({ timeout: 15_000 });

  // Real PDF
  await upload({ name: "Asha_Rao_Resume.pdf", mimeType: "application/pdf", buffer: makePdf(SAMPLE_RESUME) });
  await expect(page).toHaveURL(/\/resume\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByText("How the score was calculated")).toBeVisible();
  await expect(page.getByText(/Kubernetes/).first()).toBeVisible(); // listed but unused skill
  await expect(page.getByText(/"worked on" ×1/)).toBeVisible();

  // AI claim analysis with inline consent
  await page.getByLabel(/I agree to send my resume text/).check();
  await page.getByRole("button", { name: /Generate interview questions with AI/ }).click();
  // Scope to the form: Next.js's route announcer also uses role="alert".
  const alert = page.locator("form [role=alert]");
  // On success the page re-renders into the results view (with a "Re-run" button).
  await expect(page.getByRole("button", { name: /Re-run AI analysis/ }).or(alert)).toBeVisible({ timeout: 150_000 });
  if (await alert.isVisible()) throw new Error("AI analysis failed: " + (await alert.textContent()));
  await page.reload();
  const claims = page.locator("details").filter({ hasText: "risk" });
  await expect(claims.first()).toBeVisible();
  console.log("[claims]", await claims.count());
  await claims.first().locator("summary").click();
  await expect(claims.first().locator("ol li").first()).toBeVisible();
});

test("interview: text mock interview → evidence-based report → tasks on dashboard", async ({ page }) => {
  await login(page);
  await page.goto("/interview/new?kind=project");
  // 3-step setup: Round (preselected) → Interviewer → Details
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByLabel("Duration").selectOption("10");
  await page.getByLabel("Answer by").selectOption("text");
  await expect(page.getByRole("complementary", { name: "Summary" })).toContainText("Typing");
  await page.getByRole("button", { name: "Start interview" }).click();
  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  const transcript = page.getByRole("region", { name: "Interview transcript" });
  const interviewerMsgs = transcript.locator("li").filter({ hasNotText: /^You/ });
  await expect(transcript.locator("li").first()).toBeVisible({ timeout: 60_000 });
  const opening = await transcript.locator("li").first().textContent();
  console.log("[interviewer opening]", opening?.slice(0, 300));

  const answers = [
    "I built the pneumonia detection system. I used DenseNet121 with transfer learning because dense connections reuse features well and it was pretrained on ImageNet, which helps with only 5,800 images.",
    "The dataset was imbalanced, roughly three pneumonia images for every normal one, so I used a weighted binary cross-entropy loss and also augmentation like rotations and flips. I tracked recall because missing pneumonia is worse than a false alarm.",
    "Honestly I didn't do cross-validation, I just used the provided train and test split. Um, I would improve it with k-fold and by checking calibration.",
  ];
  for (const [i, a] of answers.entries()) {
    const before = await transcript.locator("li").count();
    await page.getByLabel("Your answer").fill(a);
    // Paste detection: the first answer arrives via a (synthetic) paste of 80+ characters.
    if (i === 0) await page.getByLabel("Your answer").evaluate((el, text) => { const dt = new DataTransfer(); dt.setData("text/plain", text); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, a);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(transcript.locator("li")).toHaveCount(before + 2, { timeout: 60_000 });
    await expect(page.getByText(/Thinking…/)).toHaveCount(0, { timeout: 60_000 });
  }
  const lastQ = await interviewerMsgs.last().textContent();
  console.log("[last follow-up]", lastQ?.slice(0, 300));

  // Persistence: reload keeps the transcript and doesn't re-open the interview
  const countBefore = await transcript.locator("li").count();
  await page.reload();
  await expect(transcript.locator("li")).toHaveCount(countBefore, { timeout: 15_000 });

  // End → report
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("button", { name: "Yes, end" }).click();
  await expect(page).toHaveURL(/\/report$/, { timeout: 180_000 });
  await expect(page.getByRole("heading", { name: "Rubric" })).toBeVisible();
  // Report v2: deterministic verdict with its steps, the one thing to fix, drills, measured metrics, timestamped quotes
  await expect(page.getByTestId("verdict")).toContainText(/Hire|Lean|No Hire|Not enough evidence/);
  await expect(page.getByText("How the verdict was decided")).toBeVisible();
  await expect(page.getByText("The one thing to fix")).toBeVisible();
  await expect(page.getByText("Mock drill one")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Measured, not judged" })).toBeVisible();
  await expect(page.getByTitle("When you said it").first()).toHaveText(/^\d+:\d\d$/);
  await expect(page.getByText("Question-by-question feedback")).toBeVisible();
  const overall = await page.getByTestId("verdict").textContent();
  console.log("[report overall]", overall);
  // Our own answer text is shown verbatim
  await page.getByText("Question 1").first().click();
  await expect(page.getByText(/DenseNet121 with transfer learning because dense connections/).first()).toBeVisible();

  // Paste flag, next steps (with suggested next difficulty) and the emoji rating
  await expect(page.getByTestId("paste-flag")).toContainText("1 answer included pasted text");
  await expect(page.getByTestId("next-harder")).toHaveAttribute("href", /difficulty=/);
  await page.getByRole("radio", { name: "Great" }).click();
  await expect(page.getByTestId("rating")).toContainText("Thanks — saved.");
  await page.reload();
  await expect(page.getByRole("radio", { name: "Great" })).toHaveAttribute("aria-checked", "true");

  // Duplicate completion is a no-op
  const id = page.url().split("/interview/")[1].split("/")[0];
  const again = await page.request.post(`/api/interview/${id}/complete`);
  expect((await again.json()).status).toBe("completed");

  // Another user's interview is invisible (RLS) — a random UUID 404s
  const other = await page.request.post(`/api/interview/00000000-0000-4000-8000-000000000000/turn`, { data: { action: "start" } });
  expect(other.status()).toBe(404);

  // Priorities appear as tasks on the dashboard
  await page.goto("/dashboard");
  const tasks = page.getByText(/From your .* mock interview/);
  const n = await tasks.count();
  console.log("[dashboard tasks]", n);
  if (n > 0) {
    await page.getByRole("button", { name: "Mark as done" }).first().click();
    await expect(page.getByRole("button", { name: "Mark as not done" }).first()).toBeVisible();
  }
});
