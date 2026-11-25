import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { makeGate, isAdminEmail } from "@/lib/content/gate";
import { allContent } from "@/lib/content/registry";
import type { ContentMeta } from "@/lib/content/types";

const item = (over: Partial<ContentMeta> = {}): ContentMeta => ({ id: "design-case:x", version: 1, type: "design-case", tags: [], status: "draft", ...over });

describe("content gate", () => {
  it("only live items are visible to users; admins also preview reviewed items, never drafts", () => {
    const g = makeGate([], [], false), a = makeGate([], [], true);
    expect(g.visible(item({ status: "live" }))).toBe(true);
    expect(g.visible(item({ status: "reviewed" }))).toBe(false);
    expect(a.visible(item({ status: "reviewed" }))).toBe(true);
    expect(a.preview(item({ status: "reviewed" }))).toBe(true);
    expect(a.visible(item({ status: "draft" }))).toBe(false);
    expect(a.preview(item({ status: "live" }))).toBe(false);
  });
  it("a review overrides the shipped status only for the same version", () => {
    const g = makeGate([{ item_id: "design-case:x", version: 1, status: "live" }], [], false);
    expect(g.visible(item())).toBe(true);
    expect(g.visible(item({ version: 2 }))).toBe(false); // edited → needs review again
  });
  it("items hidden by reports disappear for users until resolved", () => {
    const g = makeGate([], [{ item_id: "design-case:x", version: 1 }], false);
    expect(g.visible(item({ status: "live" }))).toBe(false);
    expect(g.hidden(item({ status: "live" }))).toBe(true);
    expect(g.visible(item({ status: "live", version: 2 }))).toBe(true);
  });
  it("admin emails come only from ADMIN_EMAILS, case-insensitive", () => {
    vi.stubEnv("ADMIN_EMAILS", " A@x.com ,b@y.com");
    expect(isAdminEmail("a@X.com")).toBe(true);
    expect(isAdminEmail("c@x.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("a@x.com")).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("content registry", () => {
  const items = allContent();
  it("ids are unique and typed, versions positive", () => {
    expect(new Set(items.map((i) => i.meta.id)).size).toBe(items.length);
    for (const i of items) { expect(i.meta.id.startsWith(`${i.meta.type}:`)).toBe(true); expect(i.meta.version).toBeGreaterThanOrEqual(1); }
  });
  it("every live item passes its automated checks (same checks /review shows)", () => {
    for (const i of items.filter((x) => x.meta.status === "live")) for (const c of i.checks) expect(c.ok, `${i.meta.id}: ${c.name} ${c.detail ?? ""}`).toBe(true);
  });
});
