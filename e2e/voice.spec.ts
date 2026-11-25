import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/**
 * Voice v2 in a real browser with Chromium's fake microphone fed a speech-like WAV: the mic check opens the
 * device, measures the noise floor and the VAD hears the beeps; the room shows voice settings with
 * honest availability. Speech recognition itself can't run headless, so it isn't exercised here.
 */
const stamp = Date.now();
const EMAIL = `interview-os-voice-${stamp}@example.com`;
const PASSWORD = `Voice-pass-${stamp}`;

/**
 * Chromium's default fake mic only emits ~80 ms beeps, which the VAD rightly ignores as clicks. Feed it a
 * looping WAV instead: 1.5 s silence, 2 s of a voiced (amplitude-modulated, speech-like) tone, 2.5 s silence.
 */
function speechLikeWav(): string {
  const rate = 16000;
  const seg = (sec: number, fn: (t: number) => number) => Array.from({ length: Math.round(sec * rate) }, (_, i) => fn(i / rate));
  const voiced = (t: number) => 0.35 * Math.sin(2 * Math.PI * 180 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t));
  const samples = [...seg(1.5, () => 0), ...seg(2, voiced), ...seg(2.5, () => 0)];
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  const file = path.join(tmpdir(), "ios-speech-like.wav");
  writeFileSync(file, Buffer.concat([h, data]));
  return file;
}

test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${speechLikeWav()}`] },
});
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const id = await ensureConfirmedUser(EMAIL, PASSWORD, "Vee Ice");
  await admin().from("profiles").update({
    full_name: "Vee Ice", target_role: "backend", experience_level: "student", company_track: "product",
    target_companies: [], preferred_language: "python", daily_hours: 2, dsa_level: 3, system_design_level: 2,
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

test("mic check: opens the mic, measures noise and detects sound", async ({ page }) => {
  await login(page);
  await page.goto("/mic-check");
  await page.waitForLoadState("networkidle"); // hydrate before clicking
  await page.getByRole("button", { name: "Start mic test" }).click();
  await expect(page.getByTestId("level-meter")).toBeVisible();
  await expect(page.getByText(/noise floor 0\.\d{3}/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("vad-state")).toHaveText("Hearing you", { timeout: 20_000 });
  await page.getByRole("button", { name: "Record 5 s" }).click();
  await expect(page.getByLabel("Your recording")).toBeVisible({ timeout: 15_000 });
});

test("voice room: settings dialog, honest engine availability, settings persist", async ({ page }) => {
  await login(page);
  await page.goto("/interview/new?kind=behavioral");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Answer by")).toHaveValue("voice");
  await expect(page.getByRole("link", { name: "Open the mic check" })).toBeVisible();
  await page.getByRole("button", { name: "Start interview" }).click();
  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole("region", { name: "Interview transcript" }).locator("li").first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Voice settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Voice settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Browser voice/)).toBeChecked();
  const whisper = dialog.getByLabel(/Whisper \(server\)/);
  if (await whisper.isDisabled()) await expect(dialog.getByText(/Not configured on this deployment/)).toBeVisible();
  await dialog.getByLabel(/Send when I stop talking/).uncheck();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Voice settings" }).click();
  await expect(page.getByRole("dialog", { name: "Voice settings" }).getByLabel(/Send when I stop talking/)).not.toBeChecked();
});
