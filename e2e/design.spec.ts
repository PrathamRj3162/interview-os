import { test, expect, type Page } from "@playwright/test";
import { ensureConfirmedUser, deleteUserIfExists, admin } from "./helpers";

/** System design rounds: the Excalidraw whiteboard is drawn on, read by the server with each answer, and autosaved. */
const stamp = Date.now();
const EMAIL = `interview-os-design-${stamp}@example.com`;
const PW = `Design-pass-${stamp}`;
let userId = "";

test.describe.configure({ mode: "serial" });
test.setTimeout(3 * 60_000);
test.beforeAll(async () => {
  userId = await ensureConfirmedUser(EMAIL, PW, "Dee Signer");
  await admin().from("profiles").update({ full_name: "Dee Signer", target_role: "backend", experience_level: "student", company_track: "product", target_companies: [], preferred_language: "java", daily_hours: 1, dsa_level: 3, system_design_level: 2, learning_style: "mixed", onboarded_at: new Date().toISOString() }).eq("id", userId);
});
test.afterAll(async () => { await deleteUserIfExists(EMAIL); });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/** Draws a labelled box on the Excalidraw canvas at (x, y) relative to the canvas. */
async function box(page: Page, x: number, y: number, label: string) {
  const c = (await page.locator(".excalidraw canvas.interactive").boundingBox())!;
  await page.mouse.click(c.x + c.width - 20, c.y + c.height - 20); // focus the canvas (empty corner) so tool keys work
  await page.keyboard.press("r");
  await page.mouse.move(c.x + x, c.y + y); await page.mouse.down();
  await page.mouse.move(c.x + x + 140, c.y + y + 70, { steps: 4 }); await page.mouse.up();
  await page.keyboard.press("Escape"); // drop the selection, then double-click inside to add a label
  await page.mouse.dblclick(c.x + x + 70, c.y + y + 35);
  await page.keyboard.type(label);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

test("HLD room: whiteboard is sent with the answer as text and autosaved", async ({ page }) => {
  const csp: string[] = [];
  page.on("console", (m) => { if (/Content.Security.Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  const fontHosts = new Set<string>();
  page.on("requestfinished", async (r) => { if (/\.woff2/.test(r.url())) console.log("[font]", (await r.response())?.status(), r.url().slice(0, 110)); });
  page.on("requestfailed", (r) => { if (/\.woff2/.test(r.url())) console.log("[font-failed]", r.failure()?.errorText, r.url().slice(0, 110)); });
  page.on("request", (r) => { if (/\.(woff2?|ttf)(\?|$)/.test(r.url())) fontHosts.add(new URL(r.url()).host); });

  const { data: iv } = await admin().from("mock_interviews").insert({ user_id: userId, kind: "hld", difficulty: "medium", persona: "architect", mode: "practice", input_mode: "text", duration_min: 45, topic: "Design: URL shortener" }).select("id").single();
  await login(page);
  await page.goto(`/interview/${iv!.id}`);
  await expect(page.getByTestId("whiteboard")).toBeVisible();
  await expect(page.locator(".excalidraw canvas.interactive")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Your answer")).toBeEnabled({ timeout: 30_000 });

  await box(page, 60, 80, "API servers");
  await box(page, 360, 80, "Redis cache");
  // Arrow from the first box to the second.
  const c = (await page.locator(".excalidraw canvas.interactive").boundingBox())!;
  await page.keyboard.press("a");
  await page.mouse.move(c.x + 200, c.y + 115); await page.mouse.down();
  await page.mouse.move(c.x + 360, c.y + 115, { steps: 6 }); await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("board-counts")).toHaveText("(2 boxes, 1 arrows)");

  await page.getByLabel("Your answer").fill("API servers read from a Redis cache first.");
  await page.getByRole("button", { name: "Send", exact: true }).click();

  await expect.poll(async () => {
    const { data } = await admin().from("interview_turns").select("board").eq("interview_id", iv!.id).eq("role", "candidate").not("board", "is", null);
    return data?.[0]?.board ?? "";
  }, { timeout: 30_000 }).toMatch(/\[n:\w+\] API servers[\s\S]*\[n:\w+\] Redis cache[\s\S]*Edges:\n\[e:[\w-]+\] API servers -> Redis cache/);

  // Autosave restores the drawing after a reload.
  await expect.poll(async () => {
    const { data } = await admin().from("mock_interviews").select("workspace").eq("id", iv!.id).single();
    return ((data?.workspace as { board?: { elements?: unknown[] } })?.board?.elements ?? []).length;
  }, { timeout: 15_000 }).toBe(5); // 2 boxes, 2 labels, 1 arrow
  await page.reload();
  await expect(page.getByTestId("board-counts")).toHaveText("(2 boxes, 1 arrows)", { timeout: 30_000 });

  expect(csp, csp.join("\n")).toEqual([]);
  for (const h of fontHosts) expect(h).toBe("localhost:3000"); // fonts come from our own origin, not a CDN
});

test("HLD phases: the server moves the round on by time, logs it, and the room shows it", async ({ page }) => {
  // A round that started 26 minutes ago is past requirements/estimates/API/high-level: deep dive is due.
  const started = new Date(Date.now() - 26 * 60_000).toISOString();
  const { data: iv } = await admin().from("mock_interviews").insert({ user_id: userId, kind: "hld", difficulty: "medium", persona: "architect", mode: "practice", input_mode: "text", duration_min: 45, design_case: "url-shortener", phase: "requirements", started_at: started }).select("id").single();
  await login(page);
  await page.goto(`/interview/${iv!.id}`);
  await expect(page.getByTestId("design-phases").locator("[aria-current=step]")).toHaveText("Requirements");
  // The answer box sits inside the whiteboard panel, so you can type without leaving the board.
  await expect(page.getByTestId("board-composer").getByLabel("Your answer")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Your answer")).toBeEnabled({ timeout: 30_000 });
  await page.getByLabel("Your answer").fill("Users shorten links and follow redirects; reads dominate.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("design-phases").locator("[aria-current=step]")).toHaveText("Deep dive", { timeout: 30_000 });
  const { data: row } = await admin().from("mock_interviews").select("phase").eq("id", iv!.id).single();
  expect(row!.phase).toBe("deep_dive");
  const { data: ev } = await admin().from("interview_events").select("payload").eq("interview_id", iv!.id).eq("type", "phase");
  expect(ev!.some((e) => (e.payload as { to: string; reason: string }).to === "deep_dive" && (e.payload as { reason: string }).reason === "time")).toBe(true);
});
